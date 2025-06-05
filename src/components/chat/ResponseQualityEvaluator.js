// 응답 품질 평가 시스템
export class ResponseQualityEvaluator {
	constructor() {
		// 평가 기준별 가중치
		this.weights = {
			completeness: 0.3, // 답변 완성도
			relevance: 0.25, // 관련성
			structure: 0.2, // 구조화
			references: 0.15, // 참조 링크
			length: 0.1, // 적절한 길이
		};

		// 최소 품질 점수 (이 점수 이상만 캐시에 저장)
		this.minQualityScore = 0.7;
	}

	// 전체 품질 평가
	evaluateResponse(response, query, searchResults = []) {
		const scores = {
			completeness: this.evaluateCompleteness(response, query),
			relevance: this.evaluateRelevance(response, query, searchResults),
			structure: this.evaluateStructure(response),
			references: this.evaluateReferences(response, searchResults),
			length: this.evaluateLength(response),
		};

		// 가중 평균 계산
		const totalScore = Object.entries(scores).reduce((total, [key, score]) => {
			return total + score * this.weights[key];
		}, 0);

		// 캐시 저장 여부 결정
		const shouldCache = totalScore >= this.minQualityScore;

		// 상세 평가 결과
		return {
			totalScore: Math.round(totalScore * 100) / 100,
			scores,
			shouldCache,
			confidence: this.calculateConfidence(scores),
			recommendations: this.generateRecommendations(scores),
		};
	}

	// 1. 답변 완성도 평가
	evaluateCompleteness(response, query) {
		let score = 0.5; // 기본 점수

		// 질문에 대한 직접적인 답변 포함 여부
		const queryKeywords = this.extractKeywords(query);
		const responseKeywords = this.extractKeywords(response);
		const keywordMatch = this.calculateKeywordOverlap(
			queryKeywords,
			responseKeywords,
		);
		score += keywordMatch * 0.3;

		// 답변이 질문으로 끝나지 않는지 확인
		if (!response.trim().endsWith("?")) {
			score += 0.1;
		}

		// 구체적인 정보 포함 여부
		const hasSpecificInfo = this.hasSpecificInformation(response);
		if (hasSpecificInfo) {
			score += 0.1;
		}

		return Math.min(score, 1);
	}

	// 2. 관련성 평가
	evaluateRelevance(response, query, searchResults) {
		let score = 0.5;

		// 블로그 관련 질문인 경우 검색 결과와의 일치도 확인
		if (searchResults.length > 0) {
			const relevantPosts = searchResults.filter((result) =>
				response.includes(result.post.title),
			);
			score += (relevantPosts.length / searchResults.length) * 0.3;
		}

		// 질문 유형과 답변 유형의 일치도
		const questionType = this.detectQuestionType(query);
		const responseType = this.detectResponseType(response);
		if (this.isTypeMatch(questionType, responseType)) {
			score += 0.2;
		}

		return Math.min(score, 1);
	}

	// 3. 구조화 평가
	evaluateStructure(response) {
		let score = 0.5;

		// 단락 구분 확인
		const paragraphs = response.split("\n\n").filter((p) => p.trim());
		if (paragraphs.length > 1) {
			score += 0.2;
		}

		// 목록 사용 여부
		const hasList = /[-*•]\s+.+/m.test(response);
		if (hasList) {
			score += 0.15;
		}

		// 마크다운 또는 HTML 형식 사용
		const hasFormatting =
			/<[^>]+>/.test(response) || /\*\*.*\*\*/.test(response);
		if (hasFormatting) {
			score += 0.15;
		}

		return Math.min(score, 1);
	}

	// 4. 참조 링크 평가
	evaluateReferences(response, searchResults) {
		if (searchResults.length === 0) {
			// 블로그 관련 질문이 아닌 경우
			return 0.8;
		}

		let score = 0.3;

		// 참조 섹션 포함 여부
		const hasReferenceSection = response.includes("📚 참조한 포스트:");
		if (hasReferenceSection) {
			score += 0.3;
		}

		// 실제 링크 포함 여부
		const linkPattern = /<a\s+href=["'][^"']+["'][^>]*>.*?<\/a>/gi;
		const links = response.match(linkPattern) || [];
		if (links.length > 0) {
			score += 0.4 * Math.min(links.length / searchResults.length, 1);
		}

		return Math.min(score, 1);
	}

	// 5. 길이 평가
	evaluateLength(response) {
		const length = response.length;
		const words = response.split(/\s+/).length;

		// 너무 짧은 답변 (50자 미만)
		if (length < 50) {
			return 0.2;
		}

		// 너무 긴 답변 (3000자 초과)
		if (length > 3000) {
			return 0.6;
		}

		// 이상적인 길이 (200-1000자)
		if (length >= 200 && length <= 1000) {
			return 1;
		}

		// 적절한 길이 (50-200자 또는 1000-3000자)
		return 0.8;
	}

	// 헬퍼 메서드들
	extractKeywords(text) {
		// 간단한 키워드 추출 (실제로는 더 정교한 알고리즘 필요)
		return text
			.toLowerCase()
			.replace(/[^\w\s가-힣]/g, " ")
			.split(/\s+/)
			.filter((word) => word.length > 2);
	}

	calculateKeywordOverlap(keywords1, keywords2) {
		const set1 = new Set(keywords1);
		const set2 = new Set(keywords2);
		const intersection = [...set1].filter((x) => set2.has(x));
		return intersection.length / Math.max(set1.size, 1);
	}

	hasSpecificInformation(response) {
		// 구체적인 정보 패턴들
		const patterns = [
			/\d+/, // 숫자 포함
			/https?:\/\//, // URL 포함
			/\b(예시|예를 들어|구체적으로)\b/, // 예시 언급
			/<code>|```/, // 코드 블록
		];

		return patterns.some((pattern) => pattern.test(response));
	}

	detectQuestionType(query) {
		if (/무엇|뭐|what/i.test(query)) return "definition";
		if (/어떻게|방법|how/i.test(query)) return "howto";
		if (/왜|이유|why/i.test(query)) return "explanation";
		if (/언제|when/i.test(query)) return "time";
		if (/누구|who/i.test(query)) return "person";
		return "general";
	}

	detectResponseType(response) {
		if (/정의하면|의미는|이란/i.test(response)) return "definition";
		if (/단계|먼저|다음|순서/i.test(response)) return "howto";
		if (/때문|이유는|왜냐하면/i.test(response)) return "explanation";
		return "general";
	}

	isTypeMatch(questionType, responseType) {
		if (questionType === responseType) return true;
		if (questionType === "general" || responseType === "general") return true;
		return false;
	}

	calculateConfidence(scores) {
		// 모든 점수가 0.7 이상이면 높은 신뢰도
		const allScores = Object.values(scores);
		const minScore = Math.min(...allScores);
		const avgScore = allScores.reduce((a, b) => a + b) / allScores.length;

		if (minScore >= 0.7 && avgScore >= 0.8) return "high";
		if (minScore >= 0.5 && avgScore >= 0.6) return "medium";
		return "low";
	}

	generateRecommendations(scores) {
		const recommendations = [];

		if (scores.completeness < 0.7) {
			recommendations.push("답변이 질문에 더 직접적으로 대답해야 합니다");
		}
		if (scores.relevance < 0.7) {
			recommendations.push("답변이 질문과 더 관련성이 있어야 합니다");
		}
		if (scores.structure < 0.7) {
			recommendations.push("답변 구조를 개선하여 가독성을 높여야 합니다");
		}
		if (scores.references < 0.7) {
			recommendations.push("관련 참조 링크를 추가해야 합니다");
		}
		if (scores.length < 0.7) {
			recommendations.push("답변 길이를 조정해야 합니다");
		}

		return recommendations;
	}
}

export default ResponseQualityEvaluator;

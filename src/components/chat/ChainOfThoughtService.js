/**
 * Chain of Thought (CoT) Service
 * Self-Ask 및 ReAct 패턴을 구현하여 복잡한 질문을 하위 질문으로 분해하고 처리
 */

import { KoreanNLPService } from "./KoreanNLPService";
import { WebSearchService } from "./WebSearchService";

export class ChainOfThoughtService {
	constructor() {
		this.maxSubQuestions = 5; // 최대 하위 질문 수
		this.complexityThreshold = 50; // 복잡도 임계값
		this.nlpService = new KoreanNLPService();
		this.searchService = new WebSearchService();
	}
	/**
	 * 질문의 복잡도를 평가
	 */
	assessComplexity(query) {
		let complexity = 0;

		// 1. 질문 길이
		if (query.length > 50) complexity += 20;
		if (query.length > 100) complexity += 20;

		// 2. 복합 키워드
		const complexKeywords = [
			/원인|이유|배경|과정|역사/,
			/해결|방안|대책|개선|전략/,
			/비교|차이|장단점|vs|대비/,
			/분석|평가|전망|예측|추세/,
			/관계|연관|영향|파급|효과/,
		];

		for (const keyword of complexKeywords) {
			if (keyword.test(query)) complexity += 15;
		}

		// 3. 다중 질문 표시
		const multiQuestionIndicators = /그리고|또한|아울러|뿐만\s*아니라|동시에/;
		if (multiQuestionIndicators.test(query)) complexity += 30;

		// 4. 시간적 범위
		const temporalRange = /과거|현재|미래|역사적|최신|향후|앞으로/;
		if (temporalRange.test(query)) complexity += 10;

		// 5. 여러 도메인 교차
		const domains = this.identifyDomains(query);
		if (domains.length > 1) complexity += domains.length * 10;

		return complexity;
	}

	/**
	 * 질문에서 관련 도메인 식별
	 */
	identifyDomains(query) {
		const domains = [];
		const domainPatterns = {
			economic: /경제|금융|주식|부동산|물가|고용|실업/,
			social: /사회|인구|교육|복지|문화|계층/,
			political: /정치|정책|정부|법|제도|행정/,
			technological: /기술|IT|AI|디지털|혁신|스타트업/,
			environmental: /환경|기후|에너지|지속가능|친환경/,
			health: /건강|의료|질병|보건|팬데믹|백신/,
		};

		for (const [domain, pattern] of Object.entries(domainPatterns)) {
			if (pattern.test(query)) {
				domains.push(domain);
			}
		}

		return domains;
	}

	/**
	 * 복잡한 질문을 하위 질문으로 분해 (Self-Ask 패턴)
	 */
	async decomposeQuestion(query) {
		const complexity = this.assessComplexity(query);

		// 복잡도가 낮으면 분해하지 않음
		if (complexity < this.complexityThreshold) {
			return {
				needsDecomposition: false,
				originalQuery: query,
				subQuestions: [],
			};
		}

		// 질문 유형 분석
		const questionType = this.analyzeQuestionType(query);
		const domains = this.identifyDomains(query);

		// 하위 질문 생성
		const subQuestions = this.generateSubQuestions(
			query,
			questionType,
			domains,
		);

		return {
			needsDecomposition: true,
			originalQuery: query,
			complexity: complexity,
			questionType: questionType,
			domains: domains,
			subQuestions: subQuestions,
		};
	}

	/**
	 * 질문 유형 분석
	 */
	analyzeQuestionType(query) {
		const types = [];

		if (/원인|이유|왜/.test(query)) types.push("causal");
		if (/해결|방안|어떻게/.test(query)) types.push("solution");
		if (/현황|상황|실태/.test(query)) types.push("status");
		if (/비교|차이/.test(query)) types.push("comparison");
		if (/전망|예측|미래/.test(query)) types.push("prediction");
		if (/평가|분석/.test(query)) types.push("analysis");
		if (/정의|무엇|개념/.test(query)) types.push("definition");

		return types.length > 0 ? types : ["general"];
	}

	/**
	 * 하위 질문 생성 로직
	 */
	generateSubQuestions(query, questionTypes, domains) {
		const subQuestions = [];

		// 예시: "한국의 수도권 인구 집중 문제의 원인과 해결 방안을 알려줘"
		if (query.includes("수도권") && query.includes("인구")) {
			// 현황 파악
			subQuestions.push({
				question: "한국 수도권의 현재 인구는 얼마이며 전체 인구 대비 비율은?",
				type: "factual",
				searchRequired: true,
				priority: 1,
			});

			// 원인 분석
			if (questionTypes.includes("causal")) {
				subQuestions.push({
					question:
						"수도권 인구 집중의 주요 원인은? (경제적, 사회적, 문화적 측면)",
					type: "analytical",
					searchRequired: true,
					priority: 2,
				});
			}

			// 기존 정책 검토
			subQuestions.push({
				question: "과거 정부의 수도권 인구 분산 정책 사례와 효과는?",
				type: "historical",
				searchRequired: true,
				priority: 3,
			});

			// 해결 방안
			if (questionTypes.includes("solution")) {
				subQuestions.push({
					question: "최신 연구나 해외 사례에서 제시하는 인구 분산 방안은?",
					type: "solution",
					searchRequired: true,
					priority: 4,
				});
			}
		}

		// 일반적인 패턴 기반 분해
		else {
			// 1. 정의/개념 질문
			if (questionTypes.includes("definition") || query.includes("무엇")) {
				const mainSubject = this.extractMainSubject(query);
				if (mainSubject) {
					subQuestions.push({
						question: `${mainSubject}의 정의와 개념은?`,
						type: "definition",
						searchRequired: true,
						priority: 1,
					});
				}
			}

			// 2. 원인 분석
			if (questionTypes.includes("causal")) {
				subQuestions.push({
					question: this.generateCausalQuestion(query),
					type: "causal",
					searchRequired: true,
					priority: 2,
				});
			}

			// 3. 현황/통계
			if (questionTypes.includes("status") || domains.length > 0) {
				subQuestions.push({
					question: this.generateStatusQuestion(query, domains),
					type: "factual",
					searchRequired: true,
					priority: 1,
				});
			}

			// 4. 해결 방안
			if (questionTypes.includes("solution")) {
				subQuestions.push({
					question: this.generateSolutionQuestion(query),
					type: "solution",
					searchRequired: true,
					priority: 3,
				});

				// 관련 사례 추가
				subQuestions.push({
					question: "관련 성공 사례나 모범 사례는?",
					type: "example",
					searchRequired: true,
					priority: 4,
				});
			}

			// 5. 비교 분석
			if (questionTypes.includes("comparison")) {
				subQuestions.push({
					question: this.generateComparisonQuestion(query),
					type: "comparison",
					searchRequired: true,
					priority: 2,
				});
			}
		}

		// 우선순위로 정렬하고 최대 개수 제한
		return subQuestions
			.sort((a, b) => a.priority - b.priority)
			.slice(0, this.maxSubQuestions);
	}

	/**
	 /**
	  * 주요 주제 추출 (개선된 버전 - NLP 서비스 사용)
	  */
	extractMainSubject(query) {
		return this.nlpService.extractMainSubject(query);
	}

	/**
	 * 원인 질문 생성
	 */
	generateCausalQuestion(query) {
		const subject = this.extractMainSubject(query);
		if (subject) {
			return `${subject}의 주요 원인과 배경은?`;
		}
		return "이 문제의 주요 원인은 무엇인가?";
	}

	/**
	 * 현황 질문 생성
	 */
	generateStatusQuestion(query, domains) {
		const subject = this.extractMainSubject(query);
		const domainContext =
			domains.length > 0 ? `(${domains.join(", ")} 측면)` : "";

		if (subject) {
			return `${subject}의 현재 상황과 통계 ${domainContext}`;
		}
		return `현재 상황과 관련 통계 ${domainContext}`;
	}

	/**
	 * 해결책 질문 생성
	 */
	generateSolutionQuestion(query) {
		const subject = this.extractMainSubject(query);
		if (subject) {
			return `${subject} 문제의 해결 방안과 대책은?`;
		}
		return "이 문제의 해결 방안은?";
	}

	/**
	 * 비교 질문 생성
	 */
	generateComparisonQuestion(query) {
		// 비교 대상 추출 시도
		const vsPattern = /(.+?)(?:와|과|vs|대|대비)\s*(.+)/;
		const match = query.match(vsPattern);

		if (match) {
			return `${match[1].trim()}과 ${match[2].trim()}의 주요 차이점은?`;
		}
		return "비교 대상들의 주요 차이점은?";
	}

	/**
	 * 하위 질문들의 답변을 종합하여 최종 답변 생성
	 */
	synthesizeAnswers(originalQuery, subQuestionsWithAnswers) {
		const synthesis = {
			introduction: `"${originalQuery}"에 대한 종합적인 답변입니다.`,
			sections: [],
			conclusion: "",
		};

		// 각 하위 질문의 답변을 섹션으로 구성
		for (const qa of subQuestionsWithAnswers) {
			const section = {
				title: this.generateSectionTitle(qa.type),
				content: qa.answer,
			};
			synthesis.sections.push(section);
		}

		// 결론 생성
		synthesis.conclusion = this.generateConclusion(
			originalQuery,
			subQuestionsWithAnswers,
		);

		return synthesis;
	}

	/**
	 * 하위 질문에 대한 웹 검색 수행
	 */
	async searchForSubQuestion(subQuestion) {
		try {
			// NLP를 통한 키워드 추출
			const keywords = this.nlpService.extractSearchKeywords(
				subQuestion.question,
			);
			const searchQuery = keywords.join(" ");

			console.log(`🔍 하위 질문 검색: "${subQuestion.question}"`);
			console.log(`   키워드: ${keywords.join(", ")}`);

			// 웹 검색 수행
			const searchResults = await this.searchService.search(searchQuery, {
				maxResults: 3,
				language: "ko",
			});

			// 검색 결과 요약
			if (searchResults.length > 0) {
				const summary = this.summarizeSearchResults(
					searchResults,
					subQuestion.question,
				);
				return {
					...subQuestion,
					answer: summary,
					sources: searchResults,
				};
			}
			return {
				...subQuestion,
				answer: `"${subQuestion.question}"에 대한 검색 결과를 찾을 수 없습니다.`,
				sources: [],
			};
		} catch (error) {
			console.error("하위 질문 검색 오류:", error);
			return {
				...subQuestion,
				answer: `검색 중 오류가 발생했습니다: ${error.message}`,
				sources: [],
			};
		}
	}

	/**
	 * 검색 결과 요약
	 */
	summarizeSearchResults(results, question) {
		if (results.length === 0) return "검색 결과가 없습니다.";

		let summary = "";

		// 각 결과에서 핵심 정보 추출
		results.forEach((result, index) => {
			if (index > 0) summary += "\n\n";
			summary += `📌 **${result.title}**\n`;
			summary += result.snippet;
			if (result.publishedDate) {
				const date = new Date(result.publishedDate);
				summary += ` _(${date.toLocaleDateString("ko-KR")})_`;
			}
		});

		return summary;
	}

	/**
	 * 섹션 제목 생성
	 */
	generateSectionTitle(type) {
		const titles = {
			factual: "📊 현황 및 통계",
			causal: "🔍 원인 분석",
			solution: "💡 해결 방안",
			historical: "📚 과거 사례",
			comparison: "⚖️ 비교 분석",
			definition: "📖 개념 정의",
			example: "✨ 관련 사례",
			prediction: "🔮 향후 전망",
			analysis: "📈 상세 분석",
		};
		return titles[type] || "📌 관련 정보";
	}

	/**
	 * 결론 생성
	 */
	generateConclusion(originalQuery, subQuestionsWithAnswers) {
		// 주요 포인트 추출
		const keyPoints = subQuestionsWithAnswers
			.filter((qa) => qa.type === "solution" || qa.type === "causal")
			.map((qa) => qa.answer)
			.slice(0, 3);

		if (keyPoints.length > 0) {
			return `종합하면, ${this.summarizeKeyPoints(keyPoints)}`;
		}

		return "위의 정보들을 종합하여 답변드렸습니다.";
	}

	/**
	 * 핵심 포인트 요약
	 */
	summarizeKeyPoints(points) {
		// 간단한 구현 - 실제로는 더 정교한 요약 필요
		return points.join(" 또한 ");
	}

	/**
	 * 답변 포맷팅
	 */
	formatSynthesizedAnswer(synthesis) {
		let formatted = `${synthesis.introduction}\n\n`;

		for (const section of synthesis.sections) {
			formatted += `### ${section.title}\n${section.content}\n\n`;
		}

		formatted += `### 📝 결론\n${synthesis.conclusion}`;

		return formatted;
	}
}

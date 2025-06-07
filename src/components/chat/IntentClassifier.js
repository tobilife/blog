/**
 * Advanced Intent Classification System
 * 논문 수준의 다층적 의도 분류 시스템
 */

export class IntentClassifier {
	constructor() {
		this.initializePatterns();
	}

	initializePatterns() {
		// 1. 실시간/최신 정보가 필요한 패턴 (검색 필수)
		this.realtimePatterns = {
			temporal: [
				/최신|최근|현재|오늘|어제|이번\s*(주|달|년)|지금|방금|새로운|업데이트/,
				/\d{4}년\s*\d{1,2}월|\d{1,2}월\s*\d{1,2}일|이번|다음|지난/,
				/요즘|요새|근래|최근에|얼마\s*전|며칠\s*전/,
			],
			news: [
				/뉴스|소식|발표|사건|이슈|동향|트렌드|핫한|화제|기사/,
				/논란|파문|속보|단독|긴급|브레이킹/,
				/정치|선거|대통령|이재명|윤석열/, // Edge Function 패턴 포함
			],
			weather: [
				/날씨|기온|온도|비|눈|태풍|미세먼지|황사|일기예보/,
				/춥|덥|따뜻|선선|포근|쌀쌀|습도|강수/,
				/비.*올|비.*오|눈.*올|눈.*오/, // Edge Function 패턴 포함
			],
			financial: [
				/주가|주식|코스피|코스닥|나스닥|다우|환율|금리/,
				/비트코인|이더리움|암호화폐|코인|가상화폐/,
				/부동산|아파트|집값|전세|월세|매매가/,
				/달러|원화/, // Edge Function 패턴 포함
			],
			sports: [
				/경기|시합|스코어|결과|순위|리그|월드컵|올림픽/,
				/축구|야구|농구|배구|골프|테니스|격투기/,
				/선수|감독|팀|구단|이적|계약/,
				/프로야구|시즌|우승|1위|등수|성적/, // Edge Function 패턴 포함
			],
			entertainment: [
				/영화|드라마|예능|방송|개봉|상영|시청률/,
				/가수|배우|아이돌|연예인|콘서트|공연|앨범/,
				/넷플릭스|유튜브|티빙|웨이브|디즈니/,
			],
			general: [
				/가격|시세|요금/, // Edge Function 패턴 포함
			],
		};

		// Edge Function과 동일한 패턴 추가
		this.searchPatterns = [
			/검색해/,
			/검색해줘/,
			/검색/,
			/알려줘/,
			/최신.*뉴스/,
			/뉴스/,
			/현재/,
			/지금/,
			/오늘/,
			/정치/,
			/선거/,
			/대통령/,
			/이재명/,
			/윤석열/,
			/github.*토픽/,
			/깃허브.*토픽/,
			/될거/,
			/될거 같/,
			/될 것 같/,
			// 스포츠 관련
			/순위/,
			/프로야구/,
			/축구/,
			/야구/,
			/경기.*결과/,
			/스포츠/,
			/리그/,
			/시즌/,
			/우승/,
			/1위/,
			/등수/,
			/성적/,
			// 날씨 관련
			/날씨/,
			/기온/,
			/비.*올/,
			/비.*오/,
			/눈.*올/,
			/눈.*오/,
			// 주식/경제 관련
			/주가/,
			/주식/,
			/코스피/,
			/코스닥/,
			/환율/,
			/달러/,
			/원화/,
			// 실시간 정보가 필요한 것들
			/가격/,
			/시세/,
			/요금/,
		];
		this.factCheckPatterns = {
			verification: [
				/맞아?|맞나?|진짜?|정말?|사실|확인|검증|팩트/,
				/실제로|진실|거짓|루머|가짜뉴스/,
			],
			comparison: [
				/비교|차이|vs|대|어느|뭐가\s*더|낫|좋|나쁜/,
				/장단점|특징|차이점|공통점/,
			],
			statistics: [
				/통계|수치|데이터|퍼센트|확률|비율|순위/,
				/얼마나|몇|평균|최고|최저|최대|최소/,
			],
		};

		// 3. 특정 도메인 지식이 필요한 패턴
		this.domainPatterns = {
			tech: [
				/AI|인공지능|머신러닝|딥러닝|ChatGPT|GPT|클로드/,
				/프로그래밍|코딩|개발|앱|소프트웨어|하드웨어/,
				/스마트폰|아이폰|갤럭시|컴퓨터|노트북|태블릿/,
			],
			health: [
				/건강|병원|의사|약|치료|수술|진료|처방/,
				/증상|아프|통증|질병|질환|병명|진단/,
				/운동|다이어트|영양|비타민|백신|예방/,
			],
			travel: [
				/여행|관광|호텔|항공|비행기|기차|버스/,
				/맛집|카페|레스토랑|숙소|관광지|명소/,
				/비자|여권|환전|팁|가이드|추천/,
			],
			shopping: [
				/가격|구매|구입|쇼핑|할인|세일|쿠폰/,
				/제품|상품|브랜드|모델|사양|스펙/,
				/배송|환불|교환|AS|보증|리뷰/,
			],
			education: [
				/학교|대학|수능|시험|공부|강의|수업/,
				/학원|과외|인강|자격증|토익|토플/,
				/입시|진학|취업|면접|자소서|포트폴리오/,
			],
			legal: [
				/법|법률|변호사|소송|재판|판결|고소/,
				/계약|계약서|권리|의무|책임|배상/,
				/민법|형법|상법|노동법|저작권|특허/,
			],
			food: [
				/요리|레시피|재료|조리|굽|삶|튀기|볶/,
				/음식|먹|마시|맛|향|식감|칼로리/,
				/식당|배달|테이크아웃|예약|웨이팅/,
			],
		};

		// 4. 검색 의도가 명확한 액션 패턴
		this.searchActionPatterns = [
			/검색|찾아|알아봐|조사|서치|구글|네이버/,
			/알려줘|가르쳐|설명|소개|추천|제안/,
			/어디|언제|누가|무엇|어떻게|왜|얼마/,
			/방법|하는\s*법|튜토리얼|가이드|팁|꿀팁/,
		];

		// 5. 블로그 관련 패턴 (검색 불필요)
		this.blogPatterns = [
			/블로그|토비라이프|tobilife|포스트|글|게시|카테고리/,
			/쓴\s*글|작성한|올린|포스팅|블로깅/,
		];
	}

	/**
	 * 주요 의도 분류 메서드 - Edge Function과 동일한 로직 사용
	 * @returns {Object} { intent: 'search'|'blog'|'chat', confidence: 0-1, reasons: [], domains: [] }
	 */
	classifyIntent(query) {
		const normalizedQuery = query.toLowerCase().trim();
		const result = {
			intent: "chat", // 기본값
			confidence: 0,
			reasons: [],
			domains: [],
			searchRequired: false,
			keywords: [],
		};

		// 1. 블로그 관련 질문 체크
		if (this.isBlogRelated(normalizedQuery)) {
			result.intent = "blog";
			result.confidence = 0.9;
			result.reasons.push("블로그 관련 키워드 감지");
			return result;
		}

		// 2. Edge Function과 동일한 패턴으로 검색 필요성 체크
		const needsSearch = this.searchPatterns.some((pattern) =>
			pattern.test(normalizedQuery),
		);

		if (needsSearch) {
			result.intent = "search";
			result.confidence = 0.9;
			result.searchRequired = true;

			// 도메인 분석
			if (
				/순위|프로야구|축구|야구|경기|스포츠|리그|시즌|우승|1위|등수|성적/.test(
					normalizedQuery,
				)
			) {
				result.domains.push("sports");
				result.reasons.push("sports 관련 실시간 정보 필요");
			}
			if (/날씨|기온|비.*올|비.*오|눈.*올|눈.*오/.test(normalizedQuery)) {
				result.domains.push("weather");
				result.reasons.push("weather 관련 실시간 정보 필요");
			}
			if (/주가|주식|코스피|코스닥|환율|달러|원화/.test(normalizedQuery)) {
				result.domains.push("financial");
				result.reasons.push("financial 관련 실시간 정보 필요");
			}
			if (/뉴스|정치|선거|대통령/.test(normalizedQuery)) {
				result.domains.push("news");
				result.reasons.push("news 관련 최신 정보 필요");
			}

			// 기본 이유 추가
			if (result.reasons.length === 0) {
				result.reasons.push("검색이 필요한 키워드 감지");
			}

			return result;
		}

		// 3. 기존 상세 패턴들도 체크 (호환성을 위해)
		// 실시간 정보 필요성 체크
		const realtimeCheck = this.checkRealtimeNeeds(normalizedQuery);
		if (realtimeCheck.needed) {
			result.intent = "search";
			result.confidence = realtimeCheck.confidence;
			result.searchRequired = true;
			result.reasons = realtimeCheck.reasons;
			result.domains = realtimeCheck.domains;
			result.keywords = realtimeCheck.keywords;
			return result;
		}

		// 도메인 특화 정보 체크
		const domainCheck = this.checkDomainKnowledge(normalizedQuery);
		if (domainCheck.matched && domainCheck.requiresSearch) {
			result.intent = "search";
			result.confidence = domainCheck.confidence;
			result.searchRequired = true;
			result.reasons = domainCheck.reasons;
			result.domains = domainCheck.domains;
			result.keywords = domainCheck.keywords;
			return result;
		}

		// 팩트 체크 필요성 분석
		const factCheck = this.checkFactVerification(normalizedQuery);
		if (factCheck.needed) {
			result.intent = "search";
			result.confidence = factCheck.confidence;
			result.searchRequired = true;
			result.reasons = factCheck.reasons;
			result.keywords = factCheck.keywords;
			return result;
		}

		// 문맥적 단서 분석 (고급)
		const contextualHints = this.analyzeContextualHints(normalizedQuery);
		if (contextualHints.searchSuggested) {
			result.intent = "search";
			result.confidence = contextualHints.confidence;
			result.searchRequired = true;
			result.reasons = contextualHints.reasons;
			result.keywords = contextualHints.keywords;
		}

		return result;
	}

	isBlogRelated(query) {
		return this.blogPatterns.some((pattern) => pattern.test(query));
	}

	checkExplicitSearch(query) {
		const matched = this.searchActionPatterns.some((pattern) =>
			pattern.test(query),
		);
		const keywords = [];
		const reasons = [];

		if (matched) {
			reasons.push("명시적 검색 요청 감지");
			// 검색 키워드 추출
			const words = query.split(/\s+/);
			for (const word of words) {
				if (word.length > 2 && !this.isStopWord(word)) {
					keywords.push(word);
				}
			}
		}

		return { matched, reasons, keywords };
	}

	checkRealtimeNeeds(query) {
		const result = {
			needed: false,
			confidence: 0,
			reasons: [],
			domains: [],
			keywords: [],
		};

		// 각 카테고리별 체크
		for (const [category, patterns] of Object.entries(this.realtimePatterns)) {
			for (const pattern of patterns) {
				if (pattern.test(query)) {
					result.needed = true;
					result.confidence = Math.max(result.confidence, 0.9);
					result.reasons.push(`${category} 관련 실시간 정보 필요`);
					result.domains.push(category);

					// 매칭된 부분을 키워드로 추출
					const matches = query.match(pattern);
					if (matches) {
						result.keywords.push(...matches.filter((m) => m && m.length > 2));
					}
				}
			}
		}

		return result;
	}

	checkDomainKnowledge(query) {
		const result = {
			matched: false,
			requiresSearch: false,
			confidence: 0,
			reasons: [],
			domains: [],
			keywords: [],
		};

		for (const [domain, patterns] of Object.entries(this.domainPatterns)) {
			for (const pattern of patterns) {
				if (pattern.test(query)) {
					result.matched = true;
					result.domains.push(domain);

					// 도메인 + 실시간성 조합 체크
					if (this.hasTemporalIndicator(query)) {
						result.requiresSearch = true;
						result.confidence = 0.85;
						result.reasons.push(`${domain} 도메인의 최신 정보 필요`);
					}
					// 도메인 + 질문 유형 체크
					else if (this.hasQuestionIndicator(query)) {
						result.requiresSearch = true;
						result.confidence = 0.75;
						result.reasons.push(`${domain} 도메인 관련 정보 검색 필요`);
					}

					const matches = query.match(pattern);
					if (matches) {
						result.keywords.push(...matches);
					}
				}
			}
		}

		return result;
	}

	checkFactVerification(query) {
		const result = {
			needed: false,
			confidence: 0,
			reasons: [],
			keywords: [],
		};

		for (const [type, patterns] of Object.entries(this.factCheckPatterns)) {
			for (const pattern of patterns) {
				if (pattern.test(query)) {
					result.needed = true;
					result.confidence = Math.max(result.confidence, 0.8);
					result.reasons.push(`${type} 유형의 팩트 체크 필요`);

					const matches = query.match(pattern);
					if (matches) {
						result.keywords.push(...matches.filter((m) => m && m.length > 1));
					}
				}
			}
		}

		return result;
	}

	analyzeContextualHints(query) {
		const result = {
			searchSuggested: false,
			confidence: 0,
			reasons: [],
			keywords: [],
		};

		// 1. 고유명사 감지 (대문자로 시작하는 단어들)
		const properNouns = query.match(/[A-Z][a-zA-Z]+/g);
		if (properNouns && properNouns.length > 0) {
			result.searchSuggested = true;
			result.confidence = 0.7;
			result.reasons.push("고유명사 감지 - 특정 정보 검색 필요 가능");
			result.keywords.push(...properNouns);
		}

		// 2. 숫자/날짜 패턴 감지
		const hasNumbers = /\d{3,}/.test(query); // 3자리 이상 숫자
		const hasYear = /\d{4}년?/.test(query);
		if (hasNumbers || hasYear) {
			result.searchSuggested = true;
			result.confidence = Math.max(result.confidence, 0.65);
			result.reasons.push("구체적인 수치/연도 언급 - 검증 필요");
		}

		// 3. 의문사 + 구체적 대상 조합
		const questionWords = /어디|언제|누가|누구|무엇|뭐|어떤|어느|몇/;
		if (questionWords.test(query) && query.length > 10) {
			result.searchSuggested = true;
			result.confidence = Math.max(result.confidence, 0.6);
			result.reasons.push("구체적인 정보를 묻는 질문");
		}

		// 4. 전문 용어나 약어 감지
		const hasAcronym = /[A-Z]{2,}/.test(query);
		if (hasAcronym) {
			result.searchSuggested = true;
			result.confidence = Math.max(result.confidence, 0.7);
			result.reasons.push("약어/전문용어 감지");
		}

		return result;
	}

	hasTemporalIndicator(query) {
		const temporalWords =
			/최신|최근|현재|오늘|올해|이번|요즘|근래|새로운|업데이트/;
		return temporalWords.test(query);
	}

	hasQuestionIndicator(query) {
		const questionWords = /\?|뭐|무엇|어떤|어떻게|왜|언제|어디|누구|얼마/;
		return questionWords.test(query);
	}

	isStopWord(word) {
		const stopWords = [
			"은",
			"는",
			"이",
			"가",
			"을",
			"를",
			"에",
			"의",
			"와",
			"과",
			"도",
			"로",
			"으로",
			"만",
			"라고",
			"하고",
		];
		return stopWords.includes(word);
	}

	/**
	 * 검색 쿼리 최적화
	 */
	optimizeSearchQuery(query, classification) {
		let optimizedQuery = query;

		// 불필요한 문자 제거만 하고 조사는 유지 (검색 엔진이 처리하도록)
		// 물음표, 느낌표 등 제거
		optimizedQuery = optimizedQuery.replace(/[?!~]/g, "");

		// 연속된 공백 제거 및 트림
		optimizedQuery = optimizedQuery.replace(/\s+/g, " ").trim();

		// 도메인별 키워드 강화
		if (classification.domains.length > 0) {
			const domainKeywords = {
				weather: "날씨 예보",
				financial: "실시간 시세",
				news: "최신 뉴스",
				tech: "기술 동향",
				health: "의학 정보",
			};

			for (const domain of classification.domains) {
				if (
					domainKeywords[domain] &&
					!optimizedQuery.includes(domainKeywords[domain])
				) {
					optimizedQuery = `${domainKeywords[domain]} ${optimizedQuery}`;
				}
			}
		}

		// 시간 관련 키워드 추가
		if (classification.reasons.some((r) => r.includes("실시간"))) {
			const today = new Date().toLocaleDateString("ko-KR");
			if (
				!optimizedQuery.includes("2024") &&
				!optimizedQuery.includes("2025")
			) {
				optimizedQuery = `${optimizedQuery} ${today}`;
			}
		}

		return optimizedQuery;
	}
}

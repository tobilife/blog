/**
 * 웹 검색 서비스
 * Netlify Functions를 통해 웹 검색 API 호출
 */

export class WebSearchService {
	constructor() {
		this.searchEndpoint = "/.netlify/functions/web-search";
		this.cache = new Map();
		this.cacheExpiry = 5 * 60 * 1000; // 5분
	}

	/**
	 * 웹 검색 수행
	 */
	async search(query, options = {}) {
		const {
			maxResults = 5,
			searchEngine = "google", // google, bing, duckduckgo 등
			language = "ko",
			region = "KR",
		} = options;

		// 캐시 확인
		const cacheKey = `${query}_${searchEngine}_${language}_${region}`;
		const cached = this.getFromCache(cacheKey);
		if (cached) {
			console.log("🎯 검색 캐시 히트:", query);
			return cached;
		}

		try {
			console.log("🔍 웹 검색 시작:", query);

			// Netlify Function 호출
			const response = await fetch(this.searchEndpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					query,
					maxResults,
					searchEngine,
					language,
					region,
				}),
			});

			if (!response.ok) {
				throw new Error(`검색 실패: ${response.status}`);
			}

			const data = await response.json();

			// 검색 결과 정규화
			const results = this.normalizeResults(data, searchEngine);

			// 캐시 저장
			this.saveToCache(cacheKey, results);

			console.log(`✅ 검색 완료: ${results.length}개 결과`);
			return results;
		} catch (error) {
			console.error("검색 중 오류 발생:", error);

			// 폴백: 더미 데이터 반환 (개발 중)
			return this.getFallbackResults(query);
		}
	}

	/**
	 * 검색 결과 정규화
	 */
	normalizeResults(data, searchEngine) {
		const results = [];

		// 검색 엔진별 응답 포맷 처리
		switch (searchEngine) {
			case "google":
				if (data.items) {
					data.items.forEach((item) => {
						results.push({
							title: item.title || "",
							url: item.link || "",
							snippet: item.snippet || "",
							displayUrl: item.displayLink || "",
							publishedDate:
								item.pagemap?.metatags?.[0]?.["article:published_time"] || null,
							source: "Google",
						});
					});
				}
				break;

			case "bing":
				if (data.webPages?.value) {
					data.webPages.value.forEach((item) => {
						results.push({
							title: item.name || "",
							url: item.url || "",
							snippet: item.snippet || "",
							displayUrl: item.displayUrl || "",
							publishedDate: item.dateLastCrawled || null,
							source: "Bing",
						});
					});
				}
				break;

			default:
				// 기본 포맷
				if (Array.isArray(data)) {
					data.forEach((item) => {
						results.push({
							title: item.title || "",
							url: item.url || item.link || "",
							snippet: item.snippet || item.description || "",
							displayUrl: item.domain || "",
							publishedDate: item.date || null,
							source: searchEngine,
						});
					});
				}
		}

		return results;
	}

	/**
	 * 여러 검색어에 대한 병렬 검색
	 */
	async searchMultiple(queries, options = {}) {
		console.log("🔍 다중 검색 시작:", queries);

		const searchPromises = queries.map((query) => this.search(query, options));

		try {
			const results = await Promise.all(searchPromises);
			// 결과 통합 및 중복 제거
			const combinedResults = this.combineAndDeduplicate(results);
			return combinedResults;
		} catch (error) {
			console.error("다중 검색 중 오류:", error);
			return [];
		}
	}

	/**
	 * 검색 결과 통합 및 중복 제거
	 */
	combineAndDeduplicate(resultsArray) {
		const urlMap = new Map();

		resultsArray.forEach((results) => {
			results.forEach((result) => {
				// URL을 키로 사용하여 중복 제거
				if (!urlMap.has(result.url)) {
					urlMap.set(result.url, result);
				}
			});
		});

		return Array.from(urlMap.values());
	}

	/**
	 * 특정 도메인에서 검색
	 */
	async searchInDomain(query, domain, options = {}) {
		const domainQuery = `site:${domain} ${query}`;
		return this.search(domainQuery, options);
	}

	/**
	 * 뉴스 검색
	 */
	async searchNews(query, options = {}) {
		const newsOptions = {
			...options,
			searchType: "news",
		};

		// 주요 뉴스 사이트에서 검색
		const newsDomains = [
			"naver.com",
			"daum.net",
			"chosun.com",
			"donga.com",
			"hani.co.kr",
			"khan.co.kr",
			"yonhapnews.co.kr",
		];

		const searchPromises = newsDomains.map((domain) =>
			this.searchInDomain(query, domain, newsOptions),
		);

		const results = await Promise.all(searchPromises);
		return this.combineAndDeduplicate(results);
	}

	/**
	 * 캐시 관리
	 */
	getFromCache(key) {
		const cached = this.cache.get(key);
		if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
			return cached.data;
		}
		this.cache.delete(key);
		return null;
	}

	saveToCache(key, data) {
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
		});

		// 캐시 크기 제한 (최대 100개)
		if (this.cache.size > 100) {
			const firstKey = this.cache.keys().next().value;
			this.cache.delete(firstKey);
		}
	}

	/**
	 * 폴백 결과 (개발/테스트용)
	 */
	getFallbackResults(query) {
		console.warn("⚠️ 폴백 모드: 실제 검색 대신 더미 데이터 반환");

		// 쿼리에 따른 더미 결과 생성
		const fallbackData = {
			이재명: [
				{
					title: "이재명 더불어민주당 대표, 오늘 주요 일정은",
					url: "https://example.com/news1",
					snippet:
						"이재명 더불어민주당 대표가 오늘 국회에서 기자회견을 열고...",
					displayUrl: "example.com",
					publishedDate: new Date().toISOString(),
					source: "Fallback",
				},
			],
			날씨: [
				{
					title: "오늘의 날씨 - 전국 대체로 맑음",
					url: "https://weather.example.com",
					snippet:
						"오늘은 전국이 대체로 맑은 가운데 일교차가 클 것으로 예상됩니다...",
					displayUrl: "weather.example.com",
					publishedDate: new Date().toISOString(),
					source: "Fallback",
				},
			],
		};

		// 쿼리에 맞는 결과 찾기
		for (const [keyword, results] of Object.entries(fallbackData)) {
			if (query.includes(keyword)) {
				return results;
			}
		}

		// 기본 결과
		return [
			{
				title: `"${query}"에 대한 검색 결과`,
				url: "https://example.com",
				snippet:
					"검색 결과를 찾을 수 없습니다. 실제 환경에서는 정상적인 결과가 표시됩니다.",
				displayUrl: "example.com",
				publishedDate: new Date().toISOString(),
				source: "Fallback",
			},
		];
	}

	/**
	 * 검색 결과를 마크다운으로 포맷팅
	 */
	formatResultsAsMarkdown(results, query) {
		if (results.length === 0) {
			return `"${query}"에 대한 검색 결과를 찾을 수 없습니다.`;
		}

		let markdown = `### 🔍 "${query}" 검색 결과\n\n`;

		results.forEach((result, index) => {
			markdown += `**${index + 1}. ${result.title}**\n`;
			markdown += `${result.snippet}\n`;
			markdown += `🔗 [${result.displayUrl}](${result.url})`;

			if (result.publishedDate) {
				const date = new Date(result.publishedDate);
				const formattedDate = date.toLocaleDateString("ko-KR");
				markdown += ` • ${formattedDate}`;
			}

			markdown += "\n\n";
		});

		return markdown;
	}
}

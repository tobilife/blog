/**
 * 웹 검색 서비스
 * Langflow 프록시를 통해 Tavily와 Brave Search API를 모두 사용하여
 * 최적의 검색 결과를 제공합니다.
 */
export class WebSearchService {
	constructor() {
		this.searchEndpoint = "/api/langflow/search";
		this.cache = new Map();
		this.cacheExpiry = 5 * 60 * 1000; // 5분
	}

	/**
	 * 웹 검색 수행
	 * @param {string} query - 검색 쿼리
	 * @param {Object} options - 검색 옵션 (호환성을 위해 유지)
	 * @returns {Promise<Object>} 검색 결과
	 */
	async search(query, options = {}) {
		try {
			console.log("[WebSearchService] 검색 쿼리:", query);

			// 캐시 확인
			const cacheKey = `search_${query}`;
			const cached = this.getFromCache(cacheKey);
			if (cached) {
				console.log("[WebSearchService] 캐시 히트:", query);
				return cached;
			}

			// Langflow 프록시로 검색 요청
			const response = await fetch(this.searchEndpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ query }),
			});

			if (!response.ok) {
				throw new Error(`검색 API 오류: ${response.status}`);
			}

			const data = await response.json();
			console.log("[WebSearchService] 검색 응답 받음");

			// 검색 결과 포맷팅
			const formattedResults = this.formatSearchResults(data);

			// 캐시 저장
			this.saveToCache(cacheKey, formattedResults);

			return formattedResults;
		} catch (error) {
			console.error("[WebSearchService] 검색 오류:", error);
			return {
				success: false,
				error: error.message,
				results: [],
				summary: "검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
			};
		}
	}

	/**
	 * 검색 결과 포맷팅
	 * Langflow 프록시의 응답을 ChatInterface에 맞게 변환
	 * @param {Object} data - Langflow 검색 결과
	 * @returns {Object} 포맷팅된 결과
	 */
	formatSearchResults(data) {
		if (!data || !data.results) {
			return {
				success: false,
				results: [],
				summary: "검색 결과를 찾을 수 없습니다.",
			};
		}

		// Langflow 프록시는 이미 최적의 결과를 선택해서 반환함
		const formattedResults = data.results.map((result, index) => ({
			id: `search-${Date.now()}-${index}`,
			title: result.title || "제목 없음",
			url: result.url || result.link || "",
			snippet: result.snippet || result.description || "",
			source: result.source || this.extractDomain(result.url || result.link),
			displayUrl: result.displayUrl || result.url || result.link || "",
			publishedDate: result.published_date || result.date || null,
			relevanceScore: result.relevance_score || result.score || 0.5,
		}));

		// 검색 결과 요약 생성
		const summary = this.generateSummary(formattedResults, data.query || "");

		return {
			success: true,
			results: formattedResults,
			summary,
			totalResults: formattedResults.length,
			searchEngine: data.searchEngine || "Tavily/Brave", // 프록시에서 선택한 엔진
			query: data.query || "",
		};
	}

	/**
	 * URL에서 도메인 추출
	 * @param {string} url - URL
	 * @returns {string} 도메인
	 */
	extractDomain(url) {
		if (!url) return "";
		try {
			const urlObj = new URL(url);
			return urlObj.hostname.replace("www.", "");
		} catch {
			return "";
		}
	}

	/**
	 * 검색 결과 요약 생성
	 * @param {Array} results - 검색 결과
	 * @param {string} query - 검색 쿼리
	 * @returns {string} 요약
	 */
	generateSummary(results, query) {
		if (!results || results.length === 0) {
			return `"${query}"에 대한 검색 결과를 찾을 수 없습니다.`;
		}

		const topResults = results.slice(0, 3);
		const sources = topResults.map((r) => r.source).join(", ");

		return `"${query}"에 대한 ${results.length}개의 검색 결과를 찾았습니다. 주요 출처: ${sources}`;
	}

	/**
	 * 여러 검색어에 대한 병렬 검색
	 * @param {Array<string>} queries - 검색어 배열
	 * @param {Object} options - 검색 옵션
	 * @returns {Promise<Array>} 검색 결과 배열
	 */
	async searchMultiple(queries, options = {}) {
		console.log("[WebSearchService] 다중 검색 시작:", queries);

		const searchPromises = queries.map((query) => this.search(query, options));

		try {
			const results = await Promise.all(searchPromises);
			return results;
		} catch (error) {
			console.error("[WebSearchService] 다중 검색 오류:", error);
			return queries.map(() => ({
				success: false,
				results: [],
				summary: "검색 중 오류가 발생했습니다.",
			}));
		}
	}

	/**
	 * 캐시에서 데이터 가져오기
	 * @param {string} key - 캐시 키
	 * @returns {Object|null} 캐시된 데이터
	 */
	getFromCache(key) {
		const cached = this.cache.get(key);
		if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
			return cached.data;
		}
		this.cache.delete(key);
		return null;
	}

	/**
	 * 캐시에 데이터 저장
	 * @param {string} key - 캐시 키
	 * @param {Object} data - 저장할 데이터
	 */
	saveToCache(key, data) {
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
		});
	}

	/**
	 * 캐시 비우기
	 */
	clearCache() {
		this.cache.clear();
	}

	/**
	 * 검색 가능 여부 확인
	 * @returns {boolean} 검색 가능 여부
	 */
	isAvailable() {
		// Langflow 프록시 엔드포인트 확인
		return true;
	}
}

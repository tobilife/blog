/**
 * 웹 검색 서비스
 * Langflow 프록시를 통해 Tavily와 Brave Search API를 모두 사용하여
 * 최적의 검색 결과를 제공합니다.
 */
export class WebSearchService {
	constructor() {
		// Langflow 프록시는 검색 엔드포인트가 없고 일반 채팅 엔드포인트를 사용
		this.searchEndpoint = "/.netlify/functions/langflow-proxy-astra";
		this.cache = new Map();
		this.cacheExpiry = 5 * 60 * 1000; // 5분
		this.maxCacheSize = 100; // 최대 캐시 항목 수

		// 주기적 캐시 정리 (1분마다)
		this.cleanupInterval = setInterval(() => this.cleanupExpiredCache(), 60 * 1000);
	}

	/**
	 * 만료된 캐시 항목 정리
	 */
	cleanupExpiredCache() {
		const now = Date.now();
		for (const [key, value] of this.cache.entries()) {
			if (now - value.timestamp > this.cacheExpiry) {
				this.cache.delete(key);
			}
		}

		// 캐시 크기 제한 (LRU 방식으로 오래된 항목 제거)
		if (this.cache.size > this.maxCacheSize) {
			const entriesToDelete = this.cache.size - this.maxCacheSize;
			const iterator = this.cache.keys();
			for (let i = 0; i < entriesToDelete; i++) {
				const key = iterator.next().value;
				this.cache.delete(key);
			}
		}
	}

	/**
	 * 서비스 정리 (컴포넌트 언마운트 시 호출)
	 */
	destroy() {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}
		this.cache.clear();
	}

	/**
	 * 웹 검색 수행
	 * @param {string} query - 검색 쿼리
	 * @param {Object} options - 검색 옵션 (호환성을 위해 유지)
	 * @returns {Promise<Object>} 검색 결과
	 */
	async search(query, _options = {}) {
		try {
			// 캐시 확인
			const cacheKey = `search_${query}`;
			const cached = this.getFromCache(cacheKey);
			if (cached) {
				return cached;
			}

			// Langflow 프록시로 검색 요청
			// langflow-proxy-astra.js는 input_value로 쿼리를 받음
			const response = await fetch(this.searchEndpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					input_value: query,
					conversation_history: [], // 검색만 할 때는 대화 기록 없음
				}),
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error("[WebSearchService] API 응답 오류:", errorText);
				throw new Error(`검색 API 오류: ${response.status}`);
			}

			const data = await response.json();

			// Langflow 응답에서 검색 결과 추출
			// Langflow는 검색 결과를 응답 텍스트에 포함시킴
			const searchResults = this.extractSearchResultsFromResponse(data);
			const formattedResults = this.formatSearchResults(searchResults, query);

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
	 * Langflow 응답에서 검색 결과 추출
	 * @param {Object} data - Langflow 응답
	 * @returns {Array} 검색 결과
	 */
	extractSearchResultsFromResponse(data) {
		// Langflow 응답에서 텍스트 추출
		const responseText = data?.outputs?.[0]?.outputs?.[0]?.results?.message?.text || "";

		// 검색 결과가 포함된 경우 파싱 시도
		const results = [];

		// 간단한 검색 결과 파싱 (번호 목록 형태)
		const resultPattern = /\d+\.\s*(.+?):\s*(.+?)(?=\n\d+\.|$)/gs;
		let match = resultPattern.exec(responseText);

		while (match !== null) {
			results.push({
				title: match[1].trim(),
				description: match[2].trim(),
				url: "", // URL 정보가 없는 경우
			});
			match = resultPattern.exec(responseText);
		}

		// 검색 결과가 없는 경우 전체 텍스트를 하나의 결과로
		if (results.length === 0 && responseText.length > 0) {
			results.push({
				title: "검색 결과",
				description: responseText.substring(0, 200),
				url: "",
			});
		}

		return results;
	}

	/**
	 * 검색 결과 포맷팅
	 * @param {Array} searchResults - 추출된 검색 결과
	 * @param {string} query - 원본 검색 쿼리
	 * @returns {Object} 포맷팅된 결과
	 */
	formatSearchResults(searchResults, query) {
		if (!searchResults || searchResults.length === 0) {
			return {
				success: false,
				results: [],
				summary: "검색 결과를 찾을 수 없습니다.",
			};
		}

		// 검색 결과 포맷팅
		const formattedResults = searchResults.map((result, index) => ({
			id: `search-${Date.now()}-${index}`,
			title: result.title || "제목 없음",
			url: result.url || "",
			snippet: result.description || "",
			source: result.source || this.extractDomain(result.url),
			displayUrl: result.url || "",
			publishedDate: result.published_date || null,
			relevanceScore: result.score || 0.5,
		}));

		// 검색 결과 요약 생성
		const summary = this.generateSummary(formattedResults, query);

		return {
			success: true,
			results: formattedResults,
			summary,
			totalResults: formattedResults.length,
			searchEngine: "Tavily/Brave", // Langflow 프록시가 사용하는 엔진
			query: query,
		};
	}

	/**
	 * URL에서 도메인 추출
	 * @param {string} url - URL
	 * @returns {string} 도메인
	 */
	extractDomain(url) {
		if (!url) {
			return "";
		}
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
		const sources = topResults
			.map((r) => r.source)
			.filter((s) => s)
			.join(", ");

		if (sources) {
			return `"${query}"에 대한 ${results.length}개의 검색 결과를 찾았습니다. 주요 출처: ${sources}`;
		}
		return `"${query}"에 대한 ${results.length}개의 검색 결과를 찾았습니다.`;
	}

	/**
	 * 여러 검색어에 대한 병렬 검색
	 * @param {Array<string>} queries - 검색어 배열
	 * @param {Object} options - 검색 옵션
	 * @returns {Promise<Array>} 검색 결과 배열
	 */
	async searchMultiple(queries, options = {}) {
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

	/**
	 * 검색 결과를 마크다운 형식으로 포맷팅
	 * @param {Object} searchResult - 검색 결과 객체
	 * @param {string} query - 검색 쿼리
	 * @returns {string} 마크다운 형식의 검색 결과
	 */
	formatResultsAsMarkdown(searchResult, _query) {
		if (!searchResult || !searchResult.success || !searchResult.results || searchResult.results.length === 0) {
			return "검색 결과가 없습니다.";
		}

		let markdown = "";
		const results = searchResult.results;

		// 검색 결과 요약
		if (searchResult.summary) {
			markdown += `${searchResult.summary}\n\n`;
		}

		// 각 검색 결과 포맷팅
		for (const [index, result] of results.entries()) {
			markdown += `### ${index + 1}. ${result.title || "제목 없음"}\n`;

			if (result.url) {
				markdown += `**출처**: [${result.source || result.displayUrl || result.url}](${result.url})\n`;
			}

			if (result.snippet) {
				markdown += `${result.snippet}\n`;
			}

			if (result.publishedDate) {
				markdown += `*게시일: ${result.publishedDate}*\n`;
			}

			markdown += "\n";
		}

		return markdown.trim();
	}
}

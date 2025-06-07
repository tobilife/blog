// Netlify Function: 웹 검색 프록시
// 실제 검색 API 호출을 서버 사이드에서 처리

exports.handler = async (event, context) => {
	// CORS 헤더
	const headers = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Headers": "Content-Type",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Content-Type": "application/json",
	};

	// OPTIONS 요청 처리
	if (event.httpMethod === "OPTIONS") {
		return {
			statusCode: 200,
			headers,
			body: "",
		};
	}

	// POST 요청만 허용
	if (event.httpMethod !== "POST") {
		return {
			statusCode: 405,
			headers,
			body: JSON.stringify({ error: "Method not allowed" }),
		};
	}

	try {
		const {
			query,
			maxResults = 5,
			searchEngine = "mock",
			language = "ko",
			region = "KR",
		} = JSON.parse(event.body);

		if (!query) {
			return {
				statusCode: 400,
				headers,
				body: JSON.stringify({ error: "Query is required" }),
			};
		}

		// 검색 엔진별 처리
		let searchResults = [];

		switch (searchEngine) {
			case "google":
				// Google Custom Search API 사용 (API 키 필요)
				// searchResults = await searchGoogle(query, maxResults, language);
				// 현재는 목업 데이터 반환
				searchResults = getMockResults(query, "Google");
				break;

			case "bing":
				// Bing Search API 사용 (API 키 필요)
				// searchResults = await searchBing(query, maxResults, language);
				searchResults = getMockResults(query, "Bing");
				break;

			case "duckduckgo":
				// DuckDuckGo는 공식 API가 제한적이므로 스크래핑 필요
				// searchResults = await searchDuckDuckGo(query, maxResults);
				searchResults = getMockResults(query, "DuckDuckGo");
				break;

			default:
				// 기본: 목업 데이터
				searchResults = getMockResults(query, "Mock");
		}

		return {
			statusCode: 200,
			headers,
			body: JSON.stringify(searchResults),
		};
	} catch (error) {
		console.error("검색 오류:", error);
		return {
			statusCode: 500,
			headers,
			body: JSON.stringify({ error: "Internal server error" }),
		};
	}
};

// 목업 검색 결과 생성
function getMockResults(query, source) {
	const results = [];
	const baseDate = new Date();

	// 쿼리에 따른 맞춤형 결과 생성
	if (query.includes("이재명") || query.includes("재명")) {
		results.push(
			{
				title: "이재명 대표, 국회 본회의 주요 발언",
				url: "https://news.example.com/politics/1",
				snippet:
					"이재명 더불어민주당 대표가 오늘 국회 본회의에서 정부의 경제정책에 대해 강하게 비판했다. 이 대표는...",
				displayUrl: "news.example.com",
				publishedDate: new Date(baseDate.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2시간 전
				source: source,
			},
			{
				title: "이재명, 민생경제 현장 방문 일정",
				url: "https://news.example.com/politics/2",
				snippet:
					"더불어민주당 이재명 대표가 내일 서울 시내 전통시장을 방문해 소상공인들과 간담회를 가질 예정이다...",
				displayUrl: "news.example.com",
				publishedDate: new Date(baseDate.getTime() - 5 * 60 * 60 * 1000).toISOString(), // 5시간 전
				source: source,
			},
		);
	}

	if (query.includes("날씨") || query.includes("weather")) {
		results.push(
			{
				title: "오늘의 날씨 - 전국 대체로 맑음, 일교차 주의",
				url: "https://weather.example.com/today",
				snippet:
					"오늘은 고기압의 영향으로 전국이 대체로 맑은 가운데, 아침 최저기온은 5도, 낮 최고기온은 18도까지 오르겠습니다...",
				displayUrl: "weather.example.com",
				publishedDate: new Date(baseDate.getTime() - 1 * 60 * 60 * 1000).toISOString(), // 1시간 전
				source: source,
			},
			{
				title: "주말 날씨 전망 - 토요일 전국 비 소식",
				url: "https://weather.example.com/weekend",
				snippet:
					"이번 주말 토요일은 전국에 비가 내릴 것으로 예상됩니다. 특히 중부지방은 많은 비가...",
				displayUrl: "weather.example.com",
				publishedDate: new Date(baseDate.getTime() - 3 * 60 * 60 * 1000).toISOString(), // 3시간 전
				source: source,
			},
		);
	}

	if (query.includes("주식") || query.includes("코스피")) {
		results.push({
			title: "코스피 2,600선 회복, 외국인 매수세 지속",
			url: "https://finance.example.com/kospi",
			snippet:
				"코스피가 외국인의 매수세에 힘입어 2,600선을 회복했다. 오늘 코스피는 전일 대비 15.32포인트(0.59%) 오른...",
			displayUrl: "finance.example.com",
			publishedDate: new Date(baseDate.getTime() - 30 * 60 * 1000).toISOString(), // 30분 전
			source: source,
		});
	}

	// 일반적인 결과 추가
	if (results.length === 0) {
		for (let i = 1; i <= 3; i++) {
			results.push({
				title: `"${query}" 관련 정보 ${i}`,
				url: `https://example.com/search/${i}`,
				snippet: `${query}에 대한 검색 결과입니다. 이것은 테스트 데이터이며, 실제 환경에서는 정확한 검색 결과가 표시됩니다...`,
				displayUrl: "example.com",
				publishedDate: new Date(baseDate.getTime() - i * 60 * 60 * 1000).toISOString(),
				source: source,
			});
		}
	}

	return results;
}

// 실제 Google 검색 구현 예시 (API 키 필요)
async function searchGoogle(query, maxResults, language) {
	const API_KEY = process.env.GOOGLE_API_KEY;
	const CX = process.env.GOOGLE_CX; // Custom Search Engine ID

	if (!API_KEY || !CX) {
		console.warn("Google API 키가 설정되지 않았습니다");
		return getMockResults(query, "Google");
	}

	const url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${CX}&q=${encodeURIComponent(
		query,
	)}&num=${maxResults}&lr=lang_${language}`;

	try {
		const response = await fetch(url);
		const data = await response.json();
		return data.items || [];
	} catch (error) {
		console.error("Google 검색 오류:", error);
		return getMockResults(query, "Google");
	}
}

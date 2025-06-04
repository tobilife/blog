import { Context } from "https://edge.netlify.com";

// 질문의 복잡도를 분석하는 함수
function analyzeQueryComplexity(query: string) {
  const features = {
    wordCount: query.split(" ").length,
    hasMultipleQuestions: (query.match(/\?/g) || []).length > 1,
    requiresReasoning: /왜|어떻게|분석|비교|설명|차이|장단점|평가/i.test(query),
    requiresLatestInfo: /최신|현재|오늘|요즘|최근|실시간/i.test(query),
    isSimpleFactCheck: /무엇|누구|언제|어디|몇/i.test(query) && query.split(" ").length < 8,
    hasComplexTerms: /github|프로그래밍|개발|AI|기술|경제|정치/i.test(query),
  };

  let complexityScore = 0;
  if (features.wordCount > 20) complexityScore += 2;
  if (features.wordCount > 40) complexityScore += 2;
  if (features.hasMultipleQuestions) complexityScore += 3;
  if (features.requiresReasoning) complexityScore += 2;
  if (features.requiresLatestInfo) complexityScore += 1;
  if (features.hasComplexTerms) complexityScore += 1;
  if (features.isSimpleFactCheck) complexityScore -= 2;

  let level: string;
  if (complexityScore <= 1) level = "simple";
  else if (complexityScore <= 4) level = "moderate";
  else level = "complex";

  return {
    score: complexityScore,
    level: level,
    features: features,
    recommendations: {
      timeout: 55000, // Edge Functions는 60초 타임아웃 지원, 55초 사용
      useCache: level === "simple",
      searchLimit: level === "simple" ? 2 : level === "moderate" ? 3 : 5,
      enhancePrompt: level !== "simple",
    },
  };
}

// 질문의 주제를 분석하는 함수
function analyzeQueryIntent(query: string) {
  const lowerQuery = query.toLowerCase();

  // 검색이 필요한 패턴들
  const searchPatterns = [
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
  ];

  const needsSearch = searchPatterns.some((pattern) => pattern.test(lowerQuery));

  return {
    needsSearch,
    originalQuery: query,
  };
}

// 중국어 문자를 제거하는 함수
function removeChinese(text: string): string {
  let result = text;
  result = result.replace(/集中/g, '집중');
  result = result.replace(/([\uAC00-\uD7AF\s]+)([\u4E00-\u9FFF]+)([\uAC00-\uD7AF\s]+)/g, '$1 $3');
  return result.trim();
}

// 재귀적으로 중국어 제거
function deepRemoveChinese(obj: any): any {
  if (typeof obj === 'string') {
    return removeChinese(obj);
  } else if (Array.isArray(obj)) {
    return obj.map(item => deepRemoveChinese(item));
  } else if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        newObj[key] = deepRemoveChinese(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
}

// Brave Search API 호출
async function searchBrave(query: string, apiKey: string) {
  const BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search";

  try {
    const response = await fetch(
      `${BRAVE_API_URL}?q=${encodeURIComponent(query)}&count=3&freshness=pw`,
      {
        headers: {
          "Accept": "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": apiKey,
        },
      }
    );

    if (!response.ok) {
      console.error("Brave Search API error:", response.status);
      return null;
    }

    const data = await response.json();

    if (data.web?.results) {
      return data.web.results.slice(0, 3).map((result: any) => ({
        title: result.title,
        description: result.description,
        url: result.url,
      }));
    }

    return null;
  } catch (error) {
    console.error("Brave Search error:", error);
    return null;
  }
}

// 프롬프트 향상 함수
function enhancePromptWithSearchResults(
  originalQuery: string,
  searchResults: any[] | null
) {
  const now = new Date();
  const koreaTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = koreaTime.getUTCFullYear();
  const month = koreaTime.getUTCMonth() + 1;
  const day = koreaTime.getUTCDate();
  const dayOfWeek = ["일", "월", "화", "수", "목", "금", "토"][koreaTime.getUTCDay()];

  let enhancedPrompt = `현재 사용자 질문: ${originalQuery}\n`;
  enhancedPrompt += `현재 날짜: ${year}년 ${month}월 ${day}일 ${dayOfWeek}요일 (2025년 6월 4일)\n\n`;

  if (searchResults && searchResults.length > 0) {
    enhancedPrompt += `[웹 검색 결과 - ${year}년 ${month}월 ${day}일 기준]\n\n`;

    for (const [index, result] of searchResults.entries()) {
      enhancedPrompt += `[${index + 1}] ${result.title}\n`;
      const shortDescription = result.description.length > 80
        ? `${result.description.substring(0, 80)}...`
        : result.description;
      enhancedPrompt += `${shortDescription}\n\n`;
    }
  }

  enhancedPrompt += "답변 지침:\n";
  if (searchResults && searchResults.length > 0) {
    enhancedPrompt += "위에 제공된 웹 검색 결과를 반드시 참고하여 답변하세요.\n";
    enhancedPrompt += "자체 지식이 아닌 검색 결과의 내용을 기반으로 현재 상황을 설명하세요.\n";
  }

  return enhancedPrompt;
}

export default async (request: Request, context: Context) => {
  console.log("Edge Function called");
  const startTime = Date.now();

  // CORS 헤더
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  // Preflight 요청 처리
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }

  // POST만 허용
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  try {
    // 환경 변수 가져오기
    const LANGFLOW_API_TOKEN = Deno.env.get("LANGFLOW_API_TOKEN");
    const BRAVE_API_KEY = Deno.env.get("BRAVE_SEARCH_API_KEY");
    const ASTRA_DB_REST_URL = Deno.env.get("ASTRA_DB_REST_URL");
    const ASTRA_DB_APPLICATION_TOKEN = Deno.env.get("ASTRA_DB_APPLICATION_TOKEN");
    const ASTRA_DB_KEYSPACE = Deno.env.get("ASTRA_DB_KEYSPACE");
    
    console.log("Environment check:", {
      hasLangflow: !!LANGFLOW_API_TOKEN,
      hasBrave: !!BRAVE_API_KEY,
      hasAstra: !!ASTRA_DB_REST_URL && !!ASTRA_DB_APPLICATION_TOKEN && !!ASTRA_DB_KEYSPACE
    });

    if (!LANGFLOW_API_TOKEN) {
      throw new Error("LANGFLOW_API_TOKEN is not configured");
    }

    const LANGFLOW_API_URL = "https://api.langflow.astra.datastax.com/lf/88f74398-7c51-4066-a0e2-c6a1992f0889/api/v1/run/790574cb-2624-492b-a3a5-e0e118c1416f";

    // 요청 본문 파싱
    const requestBody = await request.json();
    const userQuery = requestBody.input_value;

    console.log("User query:", userQuery);

    // 복잡도 분석
    const complexity = analyzeQueryComplexity(userQuery);
    console.log("Query complexity:", complexity);

    // 의도 분석
    const intent = analyzeQueryIntent(userQuery);
    console.log("Query intent:", intent);

    let searchResults = null;
    let enhancedQuery = userQuery;

    // 검색이 필요한 경우
    if (BRAVE_API_KEY && intent.needsSearch) {
      console.log("Searching web...");
      searchResults = await searchBrave(userQuery, BRAVE_API_KEY);
      if (searchResults) {
        console.log(`Found ${searchResults.length} search results`);
      }
    }

    // 프롬프트 향상
    if (searchResults) {
      enhancedQuery = enhancePromptWithSearchResults(userQuery, searchResults);
      requestBody.hasSearchResults = true;
    }

    requestBody.input_value = enhancedQuery;

    // max_tokens 설정
    if (!requestBody.tweaks) {
      requestBody.tweaks = {};
    }
    requestBody.tweaks.ChatOutput = {
      max_tokens: complexity.level === "simple" ? 800 : complexity.level === "moderate" ? 1500 : 2500,
    };

    console.log("Forwarding to Langflow...");

    // Langflow API 호출 (스트리밍 지원)
    const response = await fetch(LANGFLOW_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LANGFLOW_API_TOKEN}`,
        "Accept": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Langflow API error:", errorText);
      
      return new Response(
        JSON.stringify({
          error: "Langflow API error",
          status: response.status,
          message: errorText,
        }),
        { 
          status: response.status, 
          headers: { ...headers, "Content-Type": "application/json" } 
        }
      );
    }

    // 응답 처리
    const responseText = await response.text();
    let parsedResponse = JSON.parse(responseText);
    
    // 중국어 문자 제거
    parsedResponse = deepRemoveChinese(parsedResponse);
    
    if (requestBody.hasSearchResults) {
      parsedResponse.hasSearchResults = true;
    }

    console.log("Response time:", Date.now() - startTime, "ms");

    return new Response(
      JSON.stringify(parsedResponse),
      {
        status: 200,
        headers: {
          ...headers,
          "Content-Type": "application/json",
          "X-Query-Complexity": complexity.level,
          "X-Response-Time": String(Date.now() - startTime),
        },
      }
    );

  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error.message,
      }),
      { 
        status: 500, 
        headers: { ...headers, "Content-Type": "application/json" } 
      }
    );
  }
};

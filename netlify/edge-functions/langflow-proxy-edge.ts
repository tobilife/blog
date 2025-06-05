import type { Config, Context } from "https://edge.netlify.com";

// 간단한 캐시 키 생성
function generateCacheKey(question: string): string {
  return question.toLowerCase().trim().replace(/\s+/g, ' ');
}

// 질문의 복잡도를 분석하는 함수
function analyzeQueryComplexity(query: string) {
  const wordCount = query.split(" ").length;
  const hasMultipleQuestions = (query.match(/\?/g) || []).length > 1;
  const requiresReasoning = /왜|어떻게|분석|비교|설명|차이|장단점|평가/i.test(query);
  const requiresLatestInfo = /최신|현재|오늘|요즘|최근|실시간/i.test(query);
  
  let complexityScore = 0;
  if (wordCount > 20) complexityScore += 2;
  if (hasMultipleQuestions) complexityScore += 3;
  if (requiresReasoning) complexityScore += 2;
  if (requiresLatestInfo) complexityScore += 1;

  let level: string;
  if (complexityScore <= 1) level = "simple";
  else if (complexityScore <= 4) level = "moderate";
  else level = "complex";

  return {
    score: complexityScore,
    level: level,
    recommendations: {
      timeout: 55000,
      useCache: level === "simple",
      searchLimit: level === "simple" ? 2 : level === "moderate" ? 3 : 5,
      enhancePrompt: level !== "simple",
    },
  };
}

// 질문의 주제를 분석하는 함수
function analyzeQueryIntent(query: string) {
  const lowerQuery = query.toLowerCase();
  const searchPatterns = [
    /검색해/,
    /알려줘/,
    /최신.*뉴스/,
    /현재/,
    /오늘/,
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

export default async (request: Request, context: Context) => {
  console.log("Edge Function called - simplified version");
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
    
    if (!LANGFLOW_API_TOKEN) {
      throw new Error("LANGFLOW_API_TOKEN is not configured");
    }

    const LANGFLOW_API_URL = "https://api.langflow.astra.datastax.com/lf/88f74398-7c51-4066-a0e2-c6a1992f0889/api/v1/run/790574cb-2624-492b-a3a5-e0e118c1416f";

    // 요청 본문 파싱
    const requestBody = await request.json();
    const userQuery = requestBody.input_value || '';
    
    // 빈 쿼리 체크
    if (!userQuery || !userQuery.trim()) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }
    
    console.log("User query:", userQuery);
    
    // 복잡도 분석
    const complexity = analyzeQueryComplexity(userQuery);
    console.log("Query complexity:", complexity);

    // max_tokens 설정
    if (!requestBody.tweaks) {
      requestBody.tweaks = {};
    }
    requestBody.tweaks.ChatOutput = {
      max_tokens: complexity.level === "simple" ? 800 : complexity.level === "moderate" ? 1500 : 2500,
    };

    console.log("Forwarding to Langflow...");

    // Langflow API 호출
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

export const config: Config = {
  path: "/api/chat",
};

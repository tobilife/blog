// 캐시 테스트용 Edge Function
import type { Config, Context } from "https://edge.netlify.com";

export default async (request: Request, context: Context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }

  try {
    // 환경 변수 확인
    const ASTRA_DB_REST_URL = Deno.env.get("ASTRA_DB_REST_URL");
    const ASTRA_DB_APPLICATION_TOKEN = Deno.env.get("ASTRA_DB_APPLICATION_TOKEN");
    const ASTRA_DB_KEYSPACE = Deno.env.get("ASTRA_DB_KEYSPACE");

    const envCheck = {
      hasUrl: !!ASTRA_DB_REST_URL,
      hasToken: !!ASTRA_DB_APPLICATION_TOKEN,
      hasKeyspace: !!ASTRA_DB_KEYSPACE,
      keyspace: ASTRA_DB_KEYSPACE || "not set"
    };

    // URL 파라미터에서 query 가져오기
    const url = new URL(request.url);
    const query = url.searchParams.get("query") || "테스트 질문";
    
    // 캐시 키 생성
    const cacheKey = query.toLowerCase().trim().replace(/\s+/g, ' ');
    const encodedKey = encodeURIComponent(cacheKey);
    
    // Astra DB 캐시 조회
    let cacheResult = null;
    let cacheError = null;
    
    if (ASTRA_DB_REST_URL && ASTRA_DB_APPLICATION_TOKEN && ASTRA_DB_KEYSPACE) {
      const cacheUrl = `${ASTRA_DB_REST_URL}/api/rest/v2/keyspaces/${ASTRA_DB_KEYSPACE}/chat_cache/${encodedKey}`;
      
      try {
        const response = await fetch(cacheUrl, {
          method: 'GET',
          headers: {
            'X-Cassandra-Token': ASTRA_DB_APPLICATION_TOKEN,
            'Content-Type': 'application/json'
          }
        });

        const responseText = await response.text();
        
        if (response.ok) {
          cacheResult = {
            status: response.status,
            data: JSON.parse(responseText),
            found: true
          };
        } else {
          cacheResult = {
            status: response.status,
            error: responseText,
            found: false
          };
        }
      } catch (error) {
        cacheError = error.message;
      }
    }

    // 결과 반환
    const result = {
      timestamp: new Date().toISOString(),
      query: query,
      cacheKey: cacheKey,
      encodedKey: encodedKey,
      environment: envCheck,
      cacheResult: cacheResult,
      cacheError: cacheError,
      cacheUrl: ASTRA_DB_REST_URL ? `${ASTRA_DB_REST_URL}/api/rest/v2/keyspaces/${ASTRA_DB_KEYSPACE}/chat_cache/${encodedKey}` : null
    };

    return new Response(
      JSON.stringify(result, null, 2),
      { status: 200, headers }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error.message
      }),
      { status: 500, headers }
    );
  }
};

export const config: Config = {
  path: "/api/test-cache"
};

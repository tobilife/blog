// 환경 변수 테스트 함수
export async function handler(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // 환경 변수 체크
  const envCheck = {
    LANGFLOW_API_TOKEN: !!process.env.LANGFLOW_API_TOKEN,
    ASTRA_DB_ID: !!process.env.ASTRA_DB_ID,
    ASTRA_DB_REGION: !!process.env.ASTRA_DB_REGION,
    ASTRA_DB_KEYSPACE: !!process.env.ASTRA_DB_KEYSPACE,
    ASTRA_DB_APPLICATION_TOKEN: !!process.env.ASTRA_DB_APPLICATION_TOKEN,
    ASTRA_DB_REST_URL: !!process.env.ASTRA_DB_REST_URL,
    CACHE_TTL_SECONDS: process.env.CACHE_TTL_SECONDS || 'not set',
    MAX_ASYNC_WAIT_TIME: process.env.MAX_ASYNC_WAIT_TIME || 'not set',
    // 값들 (첫 10자만 표시)
    values: {
      ASTRA_DB_REST_URL: process.env.ASTRA_DB_REST_URL || 'not set',
      ASTRA_DB_KEYSPACE: process.env.ASTRA_DB_KEYSPACE || 'not set',
      ASTRA_DB_REGION: process.env.ASTRA_DB_REGION || 'not set',
      ASTRA_DB_ID: process.env.ASTRA_DB_ID || 'not set',
      TOKEN_LENGTH: process.env.ASTRA_DB_APPLICATION_TOKEN ? process.env.ASTRA_DB_APPLICATION_TOKEN.length : 0
    }
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Environment variables check',
      environment: envCheck,
      timestamp: new Date().toISOString()
    }, null, 2),
  };
}

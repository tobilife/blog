export async function handler(event, context) {
  console.log('Langflow proxy called');
  const startTime = Date.now(); // 시작 시간 기록
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // API 토큰은 Netlify 환경 변수에서 가져옴
    const API_TOKEN = process.env.LANGFLOW_API_TOKEN;
    
    if (!API_TOKEN) {
      throw new Error('LANGFLOW_API_TOKEN is not configured');
    }
    
    const LANGFLOW_API_URL = 'https://api.langflow.astra.datastax.com/lf/88f74398-7c51-4066-a0e2-c6a1992f0889/api/v1/run/790574cb-2624-492b-a3a5-e0e118c1416f';

    console.log('Forwarding to Langflow...');

    // Forward the request to Langflow with timeout
    const controller = new AbortController();
    // Netlify Functions 무료 플랜은 10초, Pro는 26초 제한
    const timeoutId = setTimeout(() => controller.abort(), 9500); // 9.5초 타임아웃 (안전 마진)

    try {
      const response = await fetch(LANGFLOW_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_TOKEN}`,
          'Accept': 'application/json',
          'X-Forwarded-For': event.headers['x-forwarded-for'] || event.headers['client-ip'] || '',
        },
        body: event.body,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      console.log('Langflow response status:', response.status);
      console.log('Response time:', Date.now() - startTime, 'ms');

      if (!response.ok) {
        console.error('Langflow API error:', responseText);
        
        // 502 에러 명시적 처리
        if (response.status === 502 || response.status === 503) {
          return {
            statusCode: 502,
            headers: {
              ...headers,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              error: 'Bad Gateway',
              message: 'Langflow API is currently unavailable. Please try again later.',
              status: response.status
            }),
          };
        }
        
        return {
          statusCode: response.status,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            error: 'Langflow API error',
            status: response.status,
            message: responseText
          }),
        };
      }

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: responseText,
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('Request timeout after 9.5 seconds');
        return {
          statusCode: 504,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            error: 'Gateway timeout',
            message: 'The request took too long to complete. Please try with a simpler question.',
            timeout: true
          }),
        };
      }
      
      // 네트워크 에러 등으로 502 반환
      console.error('Network error:', fetchError.message);
      return {
        statusCode: 502,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          error: 'Bad Gateway',
          message: 'Failed to connect to Langflow API. Please try again.',
          details: fetchError.message
        }),
      };
    }
  } catch (error) {
    console.error('Langflow proxy error:', error);
    return {
      statusCode: 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
    };
  }
}

// 캐시 관리 API

exports.handler = async (event, context) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Content-Type': 'application/json',
  };

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
    };
  }

  // 관리자 키 확인 (환경 변수로 설정)
  const adminKey = event.headers['x-admin-key'];
  const ADMIN_KEY = process.env.CACHE_ADMIN_KEY || 'your-secret-admin-key';
  
  if (adminKey !== ADMIN_KEY) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  // AstraDBClient 로드
  let client;
  try {
    const AstraDBClient = require('./utils/astra-db-client.js');
    client = new AstraDBClient();
  } catch (error) {
    console.error('Failed to initialize AstraDBClient:', error);
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error: 'Service unavailable',
        message: 'Astra DB client initialization failed',
        details: error.message
      }),
    };
  }

  try {
    // DELETE 요청: 특정 캐시 삭제
    if (event.httpMethod === 'DELETE') {
      const { query, pattern } = JSON.parse(event.body || '{}');
      
      if (!query && !pattern) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Query or pattern parameter required' }),
        };
      }
      
      // 단일 캐시 삭제
      if (query) {
        const cacheKey = query.toLowerCase().trim().replace(/\s+/g, ' ');
        const path = `/chat_cache/${encodeURIComponent(cacheKey)}`;
        
        await client.request('DELETE', path);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: 'Cache entry deleted',
            cacheKey 
          }),
        };
      }
      
      // 패턴 기반 삭제 (현재 비활성화)
      if (pattern) {
        return {
          statusCode: 501,
          headers,
          body: JSON.stringify({ 
            error: 'Not implemented',
            message: '패턴 기반 삭제는 현재 지원되지 않습니다. 개별 질문을 지정하여 삭제해주세요.' 
          }),
        };
      }
    }
    
    // GET 요청: 캐시 통계 조회 (현재는 기본 정보만 반환)
    if (event.httpMethod === 'GET') {
      // Astra DB REST API v2는 전체 테이블 스캔을 직접 지원하지 않음
      // 추후 CQL 쿼리나 다른 방법으로 구현 필요
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          totalEntries: 'N/A',
          entries: [],
          message: 'Astra DB 캐시 관리 시스템이 활성화되어 있습니다. 개별 캐시 삭제 기능을 사용할 수 있습니다.',
          features: {
            deleteByQuery: true,
            deleteByPattern: false, // 현재 전체 조회가 불가능하므로 비활성화
            clearAll: false, // 현재 전체 조회가 불가능하므로 비활성화
            viewStats: false // 현재 구현되지 않음
          }
        }),
      };
    }
    
    // POST 요청: 캐시 일괄 정리
    if (event.httpMethod === 'POST') {
      const { action } = JSON.parse(event.body || '{}');
      
      if (action === 'clear-expired') {
        // 만료된 캐시 정리 (CQL에서는 자동으로 처리되지만 수동으로도 가능)
        const now = new Date().toISOString();
        // Astra DB는 TTL을 자동으로 처리하므로 별도 작업 불필요
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: 'Expired entries are automatically handled by TTL' 
          }),
        };
      }
      
      if (action === 'clear-all') {
        // 전체 삭제 (현재 비활성화)
        return {
          statusCode: 501,
          headers,
          body: JSON.stringify({ 
            error: 'Not implemented',
            message: '전체 캐시 삭제는 현재 지원되지 않습니다. 개별 질문을 지정하여 삭제해주세요.' 
          }),
        };
      }
    }
    
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
    
  } catch (error) {
    console.error('Cache management error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};

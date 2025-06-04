// 캐시 관리 API
const AstraDBClient = require('./utils/astra-db-client.js');

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

  try {
    const client = new AstraDBClient();
    
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
      
      // 패턴 기반 삭제 (예: "날씨" 포함된 모든 캐시)
      if (pattern) {
        const result = await client.request('GET', '/chat_cache?page-size=1000');
        let deletedCount = 0;
        
        if (result.data && result.data.length > 0) {
          for (const entry of result.data) {
            if (entry.query && entry.query.includes(pattern)) {
              try {
                const path = `/chat_cache/${encodeURIComponent(entry.cache_key)}`;
                await client.request('DELETE', path);
                deletedCount++;
              } catch (err) {
                console.error('Failed to delete:', entry.cache_key);
              }
            }
          }
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: `Deleted ${deletedCount} cache entries matching pattern "${pattern}"` 
          }),
        };
      }
    }
    
    // GET 요청: 캐시 통계 조회
    if (event.httpMethod === 'GET') {
      // 모든 캐시 항목 조회 (제한적)
      const path = '/chat_cache?page-size=100';
      const result = await client.request('GET', path);
      
      const stats = {
        totalEntries: result.data?.length || 0,
        entries: result.data?.map(entry => ({
          query: entry.query,
          cacheKey: entry.cache_key,
          createdAt: entry.created_at,
          expiresAt: entry.expires_at,
          complexity: entry.complexity,
          hasSearch: entry.has_search
        })) || []
      };
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(stats),
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
        // 모든 캐시 삭제 (주의: 위험한 작업)
        // TRUNCATE는 REST API로 불가능하므로 개별 삭제 필요
        const result = await client.request('GET', '/chat_cache?page-size=1000');
        const deletedCount = 0;
        
        if (result.data && result.data.length > 0) {
          for (const entry of result.data) {
            try {
              const path = `/chat_cache/${encodeURIComponent(entry.cache_key)}`;
              await client.request('DELETE', path);
              deletedCount++;
            } catch (err) {
              console.error('Failed to delete:', entry.cache_key);
            }
          }
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: `Deleted ${deletedCount} cache entries` 
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

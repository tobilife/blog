import fetch from 'node-fetch';

const CACHE_INVALIDATION_URL = 'https://blog.tobimind.com/api/langflow/cache-invalidation';
const CHAT_API_URL = 'https://blog.tobimind.com/api/chat';

async function checkCacheStatus() {
  try {
    console.log('\n=== Checking Cache Status ===');
    
    // 캐시 무효화 실행
    console.log('\n1. Invalidating blog-related cache entries...');
    const invalidationResponse = await fetch(CACHE_INVALIDATION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!invalidationResponse.ok) {
      throw new Error(`HTTP error! status: ${invalidationResponse.status}`);
    }

    const invalidationData = await invalidationResponse.json();
    
    console.log('\nInvalidation Results:');
    console.log(`Success: ${invalidationData.success}`);
    console.log(`Invalidated Count: ${invalidationData.invalidatedCount}`);
    console.log(`Metadata Version: ${invalidationData.metadata?.version || 'unknown'}`);
    console.log(`Total Posts: ${invalidationData.metadata?.totalPosts || 0}`);
    console.log(`Last Updated: ${invalidationData.metadata?.lastUpdated || 'unknown'}`);
    
    // 테스트 쿼리 실행
    console.log('\n2. Testing with blog-related query...');
    const testQueries = [
      '블로그에 어떤 글들이 있나요?',
      '최신 포스트는 무엇인가요?',
      '어떤 주제로 글을 쓰셨나요?'
    ];
    
    for (const query of testQueries) {
      console.log(`\nQuery: "${query}"`);
      
      const testResponse = await fetch(CHAT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input_value: query,
          enableWebSearch: false
        }),
      });
      
      const headers = testResponse.headers;
      console.log(`Cache Status: ${headers.get('x-cache') || 'N/A'}`);
      console.log(`Response Time: ${headers.get('x-response-time') || 'N/A'}ms`);
      
      const data = await testResponse.json();
      if (data.metadataVersion) {
        console.log(`Metadata Version Used: ${data.metadataVersion}`);
      }
    }
    
    return invalidationData;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

// 실행
checkCacheStatus().then(() => {
  console.log('\n=== Test Complete ===');
});

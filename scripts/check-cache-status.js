import fetch from 'node-fetch';

const CACHE_CHECK_URL = 'https://blog.tobimind.com/api/cache/check';

async function checkCacheStatus() {
  try {
    const response = await fetch(CACHE_CHECK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('\n=== Cache Status ===');
    console.log(`Current Version: ${data.currentVersion}`);
    console.log(`Cached Version: ${data.cachedVersion || 'None'}`);
    console.log(`Needs Invalidation: ${data.needsInvalidation ? 'Yes' : 'No'}`);
    console.log(`Last Updated: ${data.lastUpdated}`);
    console.log(`Total Posts: ${data.totalPosts}`);
    
    return data;
  } catch (error) {
    console.error('Error checking cache status:', error);
    return null;
  }
}

// 실행
checkCacheStatus();

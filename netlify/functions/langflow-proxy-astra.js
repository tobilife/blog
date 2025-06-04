// Langflow proxy with Astra DB caching and async task handling
import { getCacheService } from './utils/cache-service.js';
import { getAsyncTaskService } from './utils/async-task-service.js';

// 질문의 복잡도를 분석하는 함수 (기존 코드 재사용)
function analyzeQueryComplexity(query) {
  const features = {
    wordCount: query.split(' ').length,
    hasMultipleQuestions: (query.match(/\?/g) || []).length > 1,
    requiresReasoning: /왜|어떻게|분석|비교|설명|차이|장단점|평가/i.test(query),
    requiresLatestInfo: /최신|현재|오늘|요즘|최근|실시간/i.test(query),
    isSimpleFactCheck: /무엇|누구|언제|어디|몇/i.test(query) && query.split(' ').length < 8,
    hasComplexTerms: /github|프로그래밍|개발|AI|기술|경제|정치/i.test(query)
  };
  
  let complexityScore = 0;
  if (features.wordCount > 20) complexityScore += 2;
  if (features.wordCount > 40) complexityScore += 2;
  if (features.hasMultipleQuestions) complexityScore += 3;
  if (features.requiresReasoning) complexityScore += 2;
  if (features.requiresLatestInfo) complexityScore += 1;
  if (features.hasComplexTerms) complexityScore += 1;
  if (features.isSimpleFactCheck) complexityScore -= 2;
  
  // 복잡도 레벨 결정
  let level;
  if (complexityScore <= 1) level = 'simple';
  else if (complexityScore <= 4) level = 'moderate';
  else level = 'complex';
  
  return {
    score: complexityScore,
    level: level,
    features: features,
    // 처리 권장사항
    recommendations: {
      timeout: level === 'simple' ? 5000 : level === 'moderate' ? 7000 : 9500,
      useCache: true, // 모든 레벨에서 캐시 사용
      useAsync: level === 'complex', // 복잡한 질문은 비동기 처리
      searchLimit: level === 'simple' ? 0 : level === 'moderate' ? 3 : 5,
      enhancePrompt: level !== 'simple'
    }
  };
}

// 질문의 주제를 분석하는 함수 (기존 코드 재사용)
function analyzeQueryIntent(query) {
  const lowerQuery = query.toLowerCase();
  
  // 날짜/시간 전용 패턴
  const dateTimePatterns = [
    /오늘.*날짜/,
    /오늘.*몇.*일/,
    /오늘.*무슨.*요일/,
    /현재.*시간/,
    /지금.*몇.*시/,
    /오늘이.*며칠/,
    /오늘.*날짜.*알려/,
    /^오늘은?\s*(몇|며칠|무슨)/,
    /^날짜/,
    /^현재\s*(날짜|시간)/
  ];
  
  // 날씨 전용 패턴  
  const weatherPatterns = [
    /날씨.*검색/,
    /날씨.*알려/,
    /날씨.*어떤/,
    /날씨.*어떻/,
    /날씨/,
    /기온/,
    /온도/,
    /\s비\s/,
    /비가\s/,
    /눈이\s/,
    /맑/,
    /흐림/,
    /구름/,
    /바람/,
    /습도/
  ];
  
  // 일반 검색이 필요한 패턴
  const searchPatterns = [
    /검색해/,
    /검색해줘/,
    /최신.*뉴스/,
    /뉴스.*헤드라인/,
    /헤드라인/,
    /뉴스.*검색/,
    /최근.*동향/,
    /요즘.*트렌드/,
    /github.*트렌드/,
    /github.*토픽/,
    /깃허브.*토픽/,
    /깃헙.*토픽/,
    /토픽.*검색/,
    /깃허브/,
    /깃헙/,
    /현재.*가격/,
    /최신.*정보/,
    /업데이트/,
    /발표/,
    /출시/
  ];
  
  // 날짜/시간 질문 확인
  const isDateTime = dateTimePatterns.some(pattern => pattern.test(lowerQuery));
  
  // 날씨 질문 확인
  const isWeather = weatherPatterns.some(pattern => pattern.test(lowerQuery));
  
  // 일반 검색 필요 확인
  const needsSearch = searchPatterns.some(pattern => pattern.test(lowerQuery)) ||
    (lowerQuery.includes('최신') || lowerQuery.includes('현재') || 
     lowerQuery.includes('오늘') || lowerQuery.includes('요즘')) &&
    !isDateTime && !isWeather;
  
  return {
    isDateTime,
    isWeather,
    needsSearch,
    originalQuery: query
  };
}

// 도시명을 추출하는 함수 (기존 코드 재사용)
function extractCity(query) {
  const cities = [
    '고양시', '고양', '서울', '부산', '대구', '인천', '광주', '대전', 
    '울산', '세종', '제주', '수원', '성남', '의정부', '안양', '부천',
    '광명', '평택', '동두천', '안산', '과천', '구리', '남양주', '오산',
    '시흥', '군포', '의왕', '하남', '용인', '파주', '이천', '안성', '김포'
  ];
  
  for (const city of cities) {
    if (query.includes(city)) {
      return city;
    }
  }
  return null;
}

// OpenWeatherMap API 호출 함수 (기존 코드 재사용)
async function getWeather(city, apiKey) {
  const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';
  
  try {
    // 도시명을 영어로 변환
    const cityMap = {
      '고양시': 'Goyang',
      '고양': 'Goyang',
      '서울': 'Seoul',
      '부산': 'Busan',
      '대구': 'Daegu',
      '인천': 'Incheon',
      '광주': 'Gwangju',
      '대전': 'Daejeon',
      '울산': 'Ulsan',
      '세종': 'Sejong',
      '제주': 'Jeju',
      '수원': 'Suwon',
      '성남': 'Seongnam',
      '의정부': 'Uijeongbu',
      '안양': 'Anyang',
      '부천': 'Bucheon',
      '광명': 'Gwangmyeong',
      '평택': 'Pyeongtaek',
      '안산': 'Ansan',
      '과천': 'Gwacheon',
      '구리': 'Guri',
      '남양주': 'Namyangju',
      '용인': 'Yongin',
      '파주': 'Paju',
      '김포': 'Gimpo'
    };
    
    let searchCity = cityMap[city] || city;
    
    console.log(`Fetching weather for ${searchCity}, KR`);
    
    const response = await fetch(
      `${WEATHER_API_URL}?q=${searchCity},KR&appid=${apiKey}&units=metric&lang=kr`
    );
    
    if (!response.ok) {
      console.error('Weather API error:', response.status, await response.text());
      return null;
    }
    
    const data = await response.json();
    console.log('Weather data received:', data);
    
    return {
      city: city,
      temp: Math.round(data.main.temp),
      feels_like: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      description: data.weather[0].description,
      wind_speed: data.wind.speed,
      clouds: data.clouds.all,
      temp_min: Math.round(data.main.temp_min),
      temp_max: Math.round(data.main.temp_max)
    };
  } catch (error) {
    console.error('Weather API error:', error);
    return null;
  }
}

// 검색 쿼리를 최적화하는 함수 (기존 코드 재사용)
function optimizeSearchQuery(query) {
  const intent = analyzeQueryIntent(query);
  
  // 날짜/시간 전용 질문
  if (intent.isDateTime) {
    return 'current date time Korea June 2025';
  }
  
  // 일반 검색 쿼리 최적화
  let optimizedQuery = query;
  
  // GitHub 관련 질문 처리
  if (query.includes('github') || query.includes('깃허브') || query.includes('깃헙')) {
    // GitHub 관련 키워드를 영어로 변환
    optimizedQuery = query
      .replace(/깃허브|깃헙/g, 'GitHub')
      .replace(/토픽/g, 'topics')
      .replace(/트렌드/g, 'trending')
      .replace(/트렌딩/g, 'trending')
      .replace(/오늘/g, 'today')
      .replace(/최신/g, 'latest')
      .replace(/요약/g, 'summary');
      
    // 필요한 경우 날짜 추가
    if (query.includes('오늘')) {
      optimizedQuery += ' June 2025';
    }
  }
  
  // 한글 키워드를 영어로 변환 (일반적인 경우)
  const keywordMap = {
    '최신': 'latest',
    '현재': 'current',
    '요즘': 'recent',
    '오늘': 'today',
    '어제': 'yesterday',
    '최근': 'recent',
    '뉴스': 'news',
    '소식': 'news',
    '동향': 'trends',
    '트렌드': 'trends',
    '현황': 'status',
    '실시간': 'real-time',
    '지금': 'now',
    '업데이트': 'update',
    '발표': 'announcement',
    '발매': 'release',
    '가격': 'price',
    '비트코인': 'bitcoin',
    '이더리움': 'ethereum',
    '주식': 'stock',
    '코스피': 'KOSPI',
    '코스닥': 'KOSDAQ'
  };
  
  // 키워드 치환 (필요한 경우)
  let processedQuery = optimizedQuery;
  for (const [kor, eng] of Object.entries(keywordMap)) {
    if (processedQuery.includes(kor)) {
      processedQuery = processedQuery.replace(new RegExp(kor, 'g'), eng);
    }
  }
  
  return processedQuery;
}

// Brave Search API 호출 함수 (기존 코드 재사용)
async function searchBrave(query, apiKey) {
  const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';
  
  // 검색 쿼리 최적화
  const searchQuery = optimizeSearchQuery(query);
  
  try {
    const response = await fetch(`${BRAVE_API_URL}?q=${encodeURIComponent(searchQuery)}&count=3&freshness=pw`, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey
      }
    });
    
    if (!response.ok) {
      console.error('Brave Search API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    // 검색 결과를 간단하게 포맷 (토큰 최적화)
    if (data.web && data.web.results) {
      return data.web.results.slice(0, 3).map(result => ({
        title: result.title.substring(0, 50),
        description: result.description.substring(0, 100),
        url: result.url
      }));
    }
    
    return null;
  } catch (error) {
    console.error('Brave Search error:', error);
    return null;
  }
}

// Tavily Search API 호출 함수 (기존 코드 재사용)
async function searchTavily(query, apiKey) {
  const TAVILY_API_URL = 'https://api.tavily.com/search';
  
  // 검색 쿼리 최적화
  const searchQuery = optimizeSearchQuery(query);
  
  try {
    const response = await fetch(TAVILY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: searchQuery,
        search_depth: 'basic',
        max_results: 3, // 토큰 최적화를 위해 3개로 제한
        include_answer: false, // 추가 토큰 절약
        include_raw_content: false,
        include_images: false
      })
    });
    
    if (!response.ok) {
      console.error('Tavily Search API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    // 검색 결과를 Brave와 동일한 포맷으로 변환
    if (data.results && data.results.length > 0) {
      return data.results.slice(0, 3).map(result => ({
        title: result.title.substring(0, 50), // 제목 길이 제한
        description: (result.content || result.snippet || '').substring(0, 100), // 100자로 제한
        url: result.url,
        score: result.score || 0
      }));
    }
    
    return null;
  } catch (error) {
    console.error('Tavily Search error:', error);
    return null;
  }
}

// 두 검색 결과를 병합하는 함수 (기존 코드 재사용)
function mergeSearchResults(braveResults, tavilyResults) {
  const allResults = [];
  const urlSet = new Set();
  
  // 결과가 없는 경우 처리
  if (!braveResults && !tavilyResults) {
    return null;
  }
  
  // Tavily 결과 먼저 추가 (AI 최적화)
  if (tavilyResults) {
    tavilyResults.forEach(result => {
      const normalizedUrl = result.url.toLowerCase().replace(/\/$/, '');
      if (!urlSet.has(normalizedUrl)) {
        urlSet.add(normalizedUrl);
        allResults.push(result);
      }
    });
  }
  
  // Brave 결과 추가 (중복 제거)
  if (braveResults) {
    braveResults.forEach(result => {
      const normalizedUrl = result.url.toLowerCase().replace(/\/$/, '');
      if (!urlSet.has(normalizedUrl)) {
        urlSet.add(normalizedUrl);
        allResults.push({
          ...result,
          score: 0.8
        });
      }
    });
  }
  
  // 스코어 기반 정렬
  allResults.sort((a, b) => (b.score || 0) - (a.score || 0));
  
  // 최대 3개 결과 반환 (토큰 최적화)
  return allResults.slice(0, 3);
}

// 병렬로 두 API를 호출하는 함수 (기존 코드 재사용)
async function performDualSearch(query, braveApiKey, tavilyApiKey) {
  console.log('Performing dual search for:', query);
  
  // 타임아웃 설정 (각 API별 2초로 축소)
  const searchWithTimeout = async (searchFn, apiKey, timeout = 2000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const result = await searchFn(query, apiKey);
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.error(`Search timeout after ${timeout}ms`);
      }
      return null;
    }
  };
  
  // 병렬 실행
  const [braveResults, tavilyResults] = await Promise.all([
    braveApiKey ? searchWithTimeout(searchBrave, braveApiKey) : Promise.resolve(null),
    tavilyApiKey ? searchWithTimeout(searchTavily, tavilyApiKey) : Promise.resolve(null)
  ]);
  
  console.log(`Search results - Brave: ${braveResults ? braveResults.length : 0}, Tavily: ${tavilyResults ? tavilyResults.length : 0}`);
  
  // 결과 병합
  return mergeSearchResults(braveResults, tavilyResults);
}

// 검색 결과를 프롬프트에 포함시키는 함수 (기존 코드 재사용)
function enhancePromptWithSearchResults(originalQuery, searchResults, weatherData, conversationHistory = []) {
  // 현재 날짜를 서버에서 직접 제공
  const now = new Date();
  const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9 한국 시간
  const year = koreaTime.getUTCFullYear();
  const month = koreaTime.getUTCMonth() + 1;
  const day = koreaTime.getUTCDate();
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][koreaTime.getUTCDay()];
  
  let enhancedPrompt = '';
  
  // 대화 맥락이 있는 경우 포함 (크게 축소)
  if (conversationHistory.length > 0) {
    enhancedPrompt += '이전:\n';
    // 최근 2개의 대화만 포함
    const recentHistory = conversationHistory.slice(-2);
    recentHistory.forEach(msg => {
      // 메시지 길이 제한 (100자)
      const content = msg.content.length > 100 ? 
        msg.content.substring(0, 100) + '...' : msg.content;
      enhancedPrompt += `${msg.role === 'user' ? 'U' : 'A'}: ${content}\n`;
    });
    enhancedPrompt += '\n';
  }
  
  enhancedPrompt += `Q: ${originalQuery}\n\n`;
  
  // 질문 의도 분석
  const intent = analyzeQueryIntent(originalQuery);
  
  // 날짜/시간 전용 질문인 경우 (간결하게)
  if (intent.isDateTime) {
    enhancedPrompt += `현재: ${year}/${month}/${day} ${dayOfWeek}\n`;
    enhancedPrompt += '위 시간 기준 답변.';
    return enhancedPrompt;
  }
  
  // 날씨 정보가 있는 경우 (간결하게)
  if (weatherData) {
    enhancedPrompt += `[날씨] ${weatherData.city}: `;
    enhancedPrompt += `${weatherData.temp}°C, ${weatherData.description}\n\n`;
  }
  
  // 검색 결과가 있는 경우 (크게 압축)
  if (searchResults && searchResults.length > 0) {
    enhancedPrompt += '[검색]\n';
    searchResults.forEach((result, index) => {
      enhancedPrompt += `${index + 1}. ${result.title}: ${result.description}\n`;
    });
    enhancedPrompt += '\n';
  }
  
  // 답변 지침 (간결하게)
  if (weatherData) {
    enhancedPrompt += '날씨 정보 기반 답변. ';
  } else if (searchResults) {
    enhancedPrompt += '검색 결과 요약. ';
  }
  
  enhancedPrompt += '간결하고 명확하게.';
  
  return enhancedPrompt;
}

// 비동기 작업을 처리하는 함수
async function processAsyncTask(taskId, requestBody, apiToken) {
  const taskService = getAsyncTaskService();
  if (!taskService) {
    console.error('Async task service not available');
    return;
  }
  
  try {
    // 작업 처리 시작 상태로 업데이트
    await taskService.startProcessing(taskId);
    
    // Langflow API 호출
    const LANGFLOW_API_URL = 'https://api.langflow.astra.datastax.com/lf/88f74398-7c51-4066-a0e2-c6a1992f0889/api/v1/run/790574cb-2624-492b-a3a5-e0e118c1416f';
    
    const response = await fetch(LANGFLOW_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    const responseText = await response.text();
    
    if (!response.ok) {
      throw new Error(`Langflow API error: ${response.status} - ${responseText}`);
    }
    
    // 작업 완료 처리
    await taskService.completeTask(taskId, responseText);
    
    // 캐시에도 저장
    const cacheService = getCacheService();
    if (cacheService) {
      const parsedResponse = JSON.parse(responseText);
      await cacheService.set(requestBody.input_value, JSON.stringify(parsedResponse));
    }
    
  } catch (error) {
    console.error('Async task processing error:', error);
    if (taskService) {
      await taskService.failTask(taskId, error);
    }
  }
}

export async function handler(event, context) {
  console.log('Langflow proxy with Astra DB called');
  const startTime = Date.now();
  
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
    // API 토큰들을 환경 변수에서 가져옴
    const API_TOKEN = process.env.LANGFLOW_API_TOKEN;
    const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY;
    const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
    const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
    
    
    // Astra DB 환경 변수 자세히 체크
    const astraConfig = {
      hasToken: !!process.env.ASTRA_DB_APPLICATION_TOKEN,
      hasUrl: !!process.env.ASTRA_DB_REST_URL,
      hasKeyspace: !!process.env.ASTRA_DB_KEYSPACE,
      tokenLength: process.env.ASTRA_DB_APPLICATION_TOKEN ? process.env.ASTRA_DB_APPLICATION_TOKEN.length : 0,
      url: process.env.ASTRA_DB_REST_URL ? 'configured' : 'missing',
      keyspace: process.env.ASTRA_DB_KEYSPACE || 'missing'
    };
    
    console.log('Environment check:', {
      hasLangflow: !!API_TOKEN,
      hasBrave: !!BRAVE_API_KEY,
      hasOpenWeather: !!OPENWEATHER_API_KEY,
      hasTavily: !!TAVILY_API_KEY,
      astraDB: astraConfig
      });
      if (!API_TOKEN) {
        throw new Error('LANGFLOW_API_TOKEN is not configured');
      }
      
      
    const LANGFLOW_API_URL = 'https://api.langflow.astra.datastax.com/lf/88f74398-7c51-4066-a0e2-c6a1992f0889/api/v1/run/790574cb-2624-492b-a3a5-e0e118c1416f';

    // 요청 본문 파싱
    const requestBody = JSON.parse(event.body);
    const userQuery = requestBody.input_value;
    const conversationHistory = requestBody.conversation_history || [];
    
    console.log('User query:', userQuery);
    console.log('Conversation history length:', conversationHistory.length);
    
    // 복잡도 분석
    const complexity = analyzeQueryComplexity(userQuery);
    console.log('Query complexity:', complexity);
    
    // Astra DB 캐시 확인
    let cacheService;
    let cachedResult = { hit: false };
    
    try {
      console.log('Initializing cache service...');
      cacheService = getCacheService();
      if (cacheService) {
        console.log('Cache service initialized successfully');
        cachedResult = await cacheService.get(userQuery, { 
          conversationLength: conversationHistory.length 
        });
      } else {
        console.log('Cache service not available');
      }
    } catch (cacheError) {
      console.error('Cache service error:', cacheError);
      // 캐시 오류는 무시하고 계속 진행
    }
    
    if (cachedResult.hit) {
      console.log('Cache hit! Returning cached response');
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'X-Response-Time': String(Date.now() - startTime)
        },
        body: cachedResult.answer,
      };
    }
    
    // 복잡한 질문이고 비동기 처리가 권장되는 경우
    if (complexity.recommendations.useAsync) {
      console.log('Complex query detected, using async processing');
      
      try {
        const taskService = getAsyncTaskService();
        if (!taskService) {
          console.log('Async task service not available, falling back to sync processing');
          // 비동기 처리 불가능, 일반 처리로 계속 진행
        } else {
          const task = await taskService.createTask(userQuery, { complexity });
          
          // 백그라운드에서 작업 처리 시작
          // Netlify Functions는 context.waitUntil을 지원하지 않으므로 즉시 작업 시작
          processAsyncTask(task.taskId, requestBody, API_TOKEN)
            .catch(error => console.error('Async task error:', error));
          
          return {
            statusCode: 202, // Accepted
            headers: {
              ...headers,
              'Content-Type': 'application/json',
              'X-Task-ID': task.taskId
            },
            body: JSON.stringify({
              status: 'processing',
              taskId: task.taskId,
              message: '복잡한 질문입니다. 잠시만 기다려주세요.',
              estimatedTime: '5-10초',
              checkStatusUrl: `/.netlify/functions/check-task-status?taskId=${task.taskId}`
            }),
          };
        }
      } catch (taskError) {
        console.error('Async task service error:', taskError);
        // 비동기 처리 실패 시 일반 처리로 계속 진행
      }
    }
    
    // 일반적인 동기 처리
    let searchResults = null;
    let weatherData = null;
    let enhancedQuery = userQuery;
    
    // 질문 의도 분석
    let intent = analyzeQueryIntent(userQuery);
    console.log('Query intent:', intent);
    
    // 날씨 정보가 필요한 경우
    if (OPENWEATHER_API_KEY && intent.isWeather) {
      const city = extractCity(userQuery) || '고양시';
      console.log('Weather requested for city:', city);
      weatherData = await getWeather(city, OPENWEATHER_API_KEY);
    }
    
    // 검색이 필요한 경우
    const hasExplicitSearchRequest = /검색해|알려줘|찾아/.test(userQuery);
    const effectiveSearchLimit = hasExplicitSearchRequest ? Math.max(3, complexity.recommendations.searchLimit) : complexity.recommendations.searchLimit;
    
    if ((BRAVE_API_KEY || TAVILY_API_KEY) && intent.needsSearch && !weatherData && !intent.isDateTime && 
        (hasExplicitSearchRequest || effectiveSearchLimit > 0)) {
      console.log('Searching web for additional context...');
      searchResults = await performDualSearch(userQuery, BRAVE_API_KEY, TAVILY_API_KEY);
    }
    
    // 프롬프트 향상
    if (weatherData || searchResults || conversationHistory.length > 0) {
      enhancedQuery = enhancePromptWithSearchResults(userQuery, searchResults, weatherData, conversationHistory);
      requestBody.hasSearchResults = !!(weatherData || searchResults);
    }
    
    // 향상된 쿼리로 요청 본문 업데이트
    requestBody.input_value = enhancedQuery;

    console.log('Forwarding to Langflow...');

    // Langflow API 호출 (타임아웃 적용)
    const controller = new AbortController();
    const dynamicTimeout = complexity.recommendations.timeout;
    console.log(`Using timeout: ${dynamicTimeout}ms for ${complexity.level} query`);
    const timeoutId = setTimeout(() => controller.abort(), dynamicTimeout);

    try {
      const response = await fetch(LANGFLOW_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_TOKEN}`,
          'Accept': 'application/json',
          'X-Forwarded-For': event.headers['x-forwarded-for'] || event.headers['client-ip'] || '',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      console.log('Langflow response status:', response.status);
      console.log('Response time:', Date.now() - startTime, 'ms');

      if (!response.ok) {
        console.error('Langflow API error:', responseText);
        
        // 타임아웃이나 오류 시 비동기 작업으로 전환
        if (response.status === 502 || response.status === 503 || response.status === 504) {
          console.log('Gateway error, switching to async processing');
          
          const taskService = getAsyncTaskService();
          const task = await taskService.createTask(userQuery, { complexity, error: 'gateway_timeout' });
          
          // 백그라운드에서 재시도
          processAsyncTask(task.taskId, requestBody, API_TOKEN)
            .catch(error => console.error('Async task error:', error));
          
          return {
            statusCode: 202,
            headers: {
              ...headers,
              'Content-Type': 'application/json',
              'X-Task-ID': task.taskId
            },
            body: JSON.stringify({
              status: 'processing',
              taskId: task.taskId,
              message: '서버가 바쁩니다. 백그라운드에서 처리 중입니다.',
              estimatedTime: '10-20초',
              checkStatusUrl: `/.netlify/functions/check-task-status?taskId=${task.taskId}`
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

      // 응답 캐싱
      if (cacheService) {
        try {
          await cacheService.set(userQuery, responseText, {
            conversationLength: conversationHistory.length,
            hasSearchResults: requestBody.hasSearchResults
          });
        } catch (cacheError) {
          console.error('Cache set error:', cacheError);
          // 캐시 저장 실패는 무시
        }
      }

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'X-Query-Complexity': complexity.level,
          'X-Query-Score': String(complexity.score),
          'X-Response-Time': String(Date.now() - startTime),
          'X-Cache': 'MISS'
        },
        body: responseText,
      };
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('Request timeout, switching to async processing');
        
        // 타임아웃 시 비동기 처리로 전환
        const taskService = getAsyncTaskService();
        const task = await taskService.createTask(userQuery, { complexity, error: 'timeout' });
        
        // 백그라운드에서 처리
        processAsyncTask(task.taskId, requestBody, API_TOKEN)
          .catch(error => console.error('Async task error:', error));
        
        return {
          statusCode: 202,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
            'X-Task-ID': task.taskId
          },
          body: JSON.stringify({
            status: 'processing',
            taskId: task.taskId,
            message: '처리 시간이 길어지고 있습니다. 백그라운드에서 처리 중입니다.',
            estimatedTime: '10-15초',
            checkStatusUrl: `/.netlify/functions/check-task-status?taskId=${task.taskId}`
          }),
        };
      }
      
      // 네트워크 에러
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
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
    return {
      statusCode: 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
    };
  }
}

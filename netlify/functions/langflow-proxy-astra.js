// Langflow proxy with Astra DB caching and async task handling
const { getCacheService } = require('./utils/cache-service.js');
const { getAsyncTaskService } = require('./utils/async-task-service.js');

// 질문의 복잡도를 분석하는 함수 (기존 코드 재사용)
function analyzeQueryComplexity(query) {
  if (!query || typeof query !== 'string') {
    return {
      score: 0,
      level: 'simple',
      features: {},
      recommendations: {
        timeout: 5000,
        useCache: true,
        useAsync: false,
        searchLimit: 0,
        enhancePrompt: false
      }
    };
  }
  
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
      timeout: 9500, // Netlify 10초 제한에 맞춰 모든 요청에 9.5초 사용
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
    /출시/,
    // 사실 확인이 필요한 패턴 추가
    /누구야/,
    /누구니/,
    /누구인가/,
    /누가.*대통령/,
    /대통령.*누구/,
    /대통령이야/,
    /이야\?$/,  // ~이야? 로 끝나는 질문
    /맞아\?$/,   // ~맞아? 로 끝나는 질문
    /사실이야/,
    /정말이야/,
    /현재.*상황/,
    /지금.*상황/,
    /현재.*어떻/,
    /지금.*어떻/,
    // 정치인 관련 패턴 추가
    /이재명/,
    /윤석열/,
    /문재인/,
    /박근혜/,
    /노무현/,
    /김대중/,
    /이명박/,
    /노태우/,
    /노회찬/,
    /안철수/,
    /한동훈/,
    /이준석/,
    /이낙연/,
    /황교안/,
    /정치인/,
    /국회의원/,
    /장관/,
    /총리/
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
    '고양시', '고양', '덕양구', '일산동구', '일산서구', // 고양시 관련
    '서울', '부산', '대구', '인천', '광주', '대전', 
    '울산', '세종', '제주', '수원', '성남', '의정부', '안양', '부천',
    '광명', '평택', '동두천', '안산', '과천', '구리', '남양주', '오산',
    '시흥', '군포', '의왕', '하남', '용인', '파주', '이천', '안성', '김포'
  ];
  
  // 고양시의 구를 포함한 경우 고양시로 통일
  if (query.includes('덕양구') || query.includes('일산동구') || query.includes('일산서구')) {
    return '고양시';
  }
  
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

// 현재 날짜 정보를 동적으로 가져오는 헬퍼 함수
function getCurrentDateInfo() {
  const now = new Date();
  const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9 한국 시간
  const year = koreaTime.getUTCFullYear();
  const month = koreaTime.getUTCMonth() + 1;
  const day = koreaTime.getUTCDate();
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][koreaTime.getUTCDay()];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = monthNames[koreaTime.getUTCMonth()];
  
  return {
    year,
    month,
    day,
    dayOfWeek,
    monthName,
    dateString: `${year}/${month}/${day}`,
    englishDateString: `${monthName} ${year}`
  };
}
// 검색 쿼리를 최적화하는 함수 (기존 코드 재사용)
function optimizeSearchQuery(query) {
  const intent = analyzeQueryIntent(query);
  
  // 날짜/시간 전용 질문
  if (intent.isDateTime) {
    const dateInfo = getCurrentDateInfo();
    return `current date time Korea ${dateInfo.englishDateString}`;
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
      const dateInfo = getCurrentDateInfo();
      optimizedQuery += ` ${dateInfo.englishDateString}`;
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

// Google Custom Search API 호출 함수
async function searchGoogle(query, apiKey, searchEngineId) {
 const GOOGLE_API_URL = 'https://www.googleapis.com/customsearch/v1';
 
 // 검색 쿼리 최적화
 const searchQuery = optimizeSearchQuery(query);
 
 try {
  const params = new URLSearchParams({
   key: apiKey,
   cx: searchEngineId,
   q: searchQuery,
   num: 5, // 더 많은 결과 가져오기 (Google은 더 정확하므로)
   lr: 'lang_ko', // 한국어 결과 우선
   safe: 'active'
  });
  
  const response = await fetch(`${GOOGLE_API_URL}?${params}`);
  
  if (!response.ok) {
   const errorData = await response.json();
   console.error('Google Search API error:', response.status, errorData);
   
   // 할당량 초과 에러 체크
   if (response.status === 429 || 
    (errorData.error && errorData.error.message && errorData.error.message.includes('quota'))) {
    return { quotaExceeded: true };
   }
   return null;
  }
  
  const data = await response.json();
  
  // Google 검색 결과를 표준 포맷으로 변환
  if (data.items && data.items.length > 0) {
   return data.items.map(item => ({
    title: item.title.substring(0, 80), // 제목 길이 제한
    description: (item.snippet || '').substring(0, 150), // 설명 길이 제한
    url: item.link,
    score: 1.0, // Google 결과는 최고 점수
    source: 'Google'
   }));
  }
  
  return null;
 } catch (error) {
  console.error('Google Search error:', error);
  return null;
 }
}

// API 사용량 관리 함수들
async function getGoogleSearchCount() {
 const cacheService = getCacheService();
 if (!cacheService) return { count: 0, canUse: true };
 
 try {
  // 오늘 날짜 키 생성 (한국 시간 기준)
  const now = new Date();
  const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const dateKey = `${koreaTime.getUTCFullYear()}-${String(koreaTime.getUTCMonth() + 1).padStart(2, '0')}-${String(koreaTime.getUTCDate()).padStart(2, '0')}`;
  
  // Astra DB에서 사용량 조회
  const usageData = await cacheService.getApiUsage(dateKey);
  
  if (!usageData) {
   // 오늘 처음 사용
   return { count: 0, canUse: true, dateKey };
  }
  
  const count = usageData.google_search_count || 0;
  return {
   count: count,
   canUse: count < 100, // 일일 무료 할당량
   dateKey: dateKey
  };
 } catch (error) {
  console.error('Error getting Google search count:', error);
  // 에러 시에도 서비스는 계속 되도록
  return { count: 0, canUse: true };
 }
}

async function incrementGoogleSearchCount(dateKey) {
 const cacheService = getCacheService();
 if (!cacheService) return;
 
 try {
  await cacheService.incrementApiUsage(dateKey, 'google');
 } catch (error) {
  console.error('Error incrementing Google search count:', error);
  // 카운트 증가 실패해도 서비스는 계속
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

// 세 검색 결과를 병합하는 함수 (수정됨)
function mergeSearchResults(googleResults, braveResults, tavilyResults) {
 const allResults = [];
 const urlSet = new Set();
 
 // 결과가 없는 경우 처리
 if (!googleResults && !braveResults && !tavilyResults) {
  return null;
 }
 
 // Google 결과 먼저 추가 (가장 정확하므로)
 if (googleResults && !googleResults.quotaExceeded) {
  googleResults.forEach(result => {
   const normalizedUrl = result.url.toLowerCase().replace(/\/$/, '');
   if (!urlSet.has(normalizedUrl)) {
    urlSet.add(normalizedUrl);
    allResults.push(result);
   }
  });
 }
 
 // Tavily 결과 추가 (AI 최적화)
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
     score: result.score || 0.8
    });
   }
  });
 }
 
 // 스코어 기반 정렬
 allResults.sort((a, b) => (b.score || 0) - (a.score || 0));
 
 // 최대 5개 결과 반환 (Google이 있으면 더 많이 가능)
 return allResults.slice(0, 5);
 }
 
 // Google 우선 + 선택적 보완 검색 함수
 async function performEnhancedSearch(query, googleApiKey, googleSearchEngineId, braveApiKey, tavilyApiKey) {
 console.log('Performing enhanced search for:', query);
 
 // Google 검색 사용량 확인
 const googleUsage = await getGoogleSearchCount();
 console.log(`Google search usage: ${googleUsage.count}/100, can use: ${googleUsage.canUse}`);
 
 // 타임아웃 설정
 const searchWithTimeout = async (searchFn, ...args) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);
  
  try {
   const result = await searchFn(...args);
   clearTimeout(timeoutId);
   return result;
  } catch (error) {
   clearTimeout(timeoutId);
   if (error.name === 'AbortError') {
    console.error(`Search timeout after 2000ms`);
   }
   return null;
  }
 };
 
 let googleResults = null;
 let braveResults = null;
 let tavilyResults = null;
 
 // Google 검색 (사용 가능한 경우)
 if (googleApiKey && googleSearchEngineId && googleUsage.canUse) {
  googleResults = await searchWithTimeout(searchGoogle, query, googleApiKey, googleSearchEngineId);
  
  // Google 검색 성공 시 카운트 증가
  if (googleResults && !googleResults.quotaExceeded && googleResults.length > 0) {
   await incrementGoogleSearchCount(googleUsage.dateKey);
   
   // Google 결과가 충분한 경우 (3개 이상) 다른 API 호출 생략
   if (googleResults.length >= 3) {
    console.log('Sufficient Google results, skipping other APIs');
    return googleResults;
   }
  }
 }
 
 // Google 결과가 부족하거나 사용 불가시 Brave/Tavily 병렬 호출
 const [braveRes, tavilyRes] = await Promise.all([
  braveApiKey ? searchWithTimeout(searchBrave, query, braveApiKey) : Promise.resolve(null),
  tavilyApiKey ? searchWithTimeout(searchTavily, query, tavilyApiKey) : Promise.resolve(null)
 ]);
 
 braveResults = braveRes;
 tavilyResults = tavilyRes;
 
 console.log(`Search results - Google: ${googleResults ? googleResults.length : 0}, Brave: ${braveResults ? braveResults.length : 0}, Tavily: ${tavilyResults ? tavilyResults.length : 0}`);
 
 // 결과 병합
 return mergeSearchResults(googleResults, braveResults, tavilyResults);
}


// 검색 결과를 프롬프트에 포함시키는 함수 (기존 코드 재사용)
function enhancePromptWithSearchResults(originalQuery, searchResults, weatherData, conversationHistory = []) {
  // 현재 날짜 정보 가져오기
  const dateInfo = getCurrentDateInfo();
  
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
        enhancedPrompt += `현재: ${dateInfo.dateString} ${dateInfo.dayOfWeek}\n`;
    enhancedPrompt += '위 시간 기준 답변.';
    return enhancedPrompt;
  }
  
  // 날씨 정보가 있는 경우 (간결하게)
  if (weatherData) {
    enhancedPrompt += `[실시간 날씨 정보]\n`;
    enhancedPrompt += `도시: ${weatherData.city}\n`;
    enhancedPrompt += `현재 기온: ${weatherData.temp}°C (체감: ${weatherData.feels_like}°C)\n`;
    enhancedPrompt += `날씨: ${weatherData.description}\n`;
    enhancedPrompt += `최저/최고: ${weatherData.temp_min}°C / ${weatherData.temp_max}°C\n`;
    enhancedPrompt += `습도: ${weatherData.humidity}%\n`;
    enhancedPrompt += `풍속: ${weatherData.wind_speed}m/s\n\n`;
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
    enhancedPrompt += '위의 실시간 날씨 정보를 기반으로 답변해주세요. 웹 검색 결과는 무시하고 OpenWeatherMap API 데이터만 사용하세요.';
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
      // requestBody에서 필요한 컨텍스트 정보 추출
      const complexity = requestBody.complexity || { score: 0 };
      await cacheService.set(requestBody.input_value, JSON.stringify(parsedResponse), {
        conversationLength: requestBody.conversation_history ? requestBody.conversation_history.length : 0,
        hasSearchResults: requestBody.hasSearchResults || false,
        complexity: complexity.score || 0,
        responseTime: 0 // 비동기 처리이므로 정확한 시간 계산 어려움
      });
    }
    
  } catch (error) {
    console.error('Async task processing error:', error);
    if (taskService) {
      await taskService.failTask(taskId, error);
    }
  }
  }
  
  exports.handler = async function(event, context) {
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
    const GOOGLE_API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;
    
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
      hasGoogle: !!GOOGLE_API_KEY,
      hasGoogleEngine: !!GOOGLE_SEARCH_ENGINE_ID,
      astraDB: astraConfig
      });
      if (!API_TOKEN) {
        throw new Error('LANGFLOW_API_TOKEN is not configured');
      }
      
      
    const LANGFLOW_API_URL = 'https://api.langflow.astra.datastax.com/lf/88f74398-7c51-4066-a0e2-c6a1992f0889/api/v1/run/790574cb-2624-492b-a3a5-e0e118c1416f';

    // 요청 본문 파싱
    const requestBody = JSON.parse(event.body);
    const userQuery = requestBody.input_value || '';
    const conversationHistory = requestBody.conversation_history || [];
    
    // 빈 쿼리 체크
    if (!userQuery || !userQuery.trim()) {
      return {
        statusCode: 400,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Query is required' }),
      };
    }
    
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
    
    // 비동기 처리 비활성화 - 모든 요청을 동기적으로 처리
    // Netlify Functions는 응답 후 즉시 종료되므로 백그라운드 작업이 불가능
    /*
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
    */
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
    
    // 날씨 정보를 이미 가져왔거나, 날씨 질문이 아닌 경우에만 웹 검색
    if ((GOOGLE_API_KEY || BRAVE_API_KEY || TAVILY_API_KEY) && intent.needsSearch && !intent.isWeather && !intent.isDateTime && 
        (hasExplicitSearchRequest || effectiveSearchLimit > 0)) {
      console.log('Searching web for additional context...');
      searchResults = await performEnhancedSearch(userQuery, GOOGLE_API_KEY, GOOGLE_SEARCH_ENGINE_ID, BRAVE_API_KEY, TAVILY_API_KEY);
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
        
        // Gateway 오류 시 직접 오류 반환
        /*
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
              message: '서버가 바셩니다. 백그라운드에서 처리 중입니다.',
              estimatedTime: '10-20초',
              checkStatusUrl: `/.netlify/functions/check-task-status?taskId=${task.taskId}`
            }),
          };
        }
        */
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
            hasSearchResults: requestBody.hasSearchResults,
            complexity: complexity.score,
            responseTime: Date.now() - startTime
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
        console.error('Request timeout after', dynamicTimeout, 'ms');
        
        // 타임아웃 시 직접 오류 반환
        /*
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
        */
        
        return {
          statusCode: 504,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            error: 'Gateway timeout',
            message: '요청 처리 시간이 초과되었습니다. 더 간단한 질문을 해보세요.',
            timeout: true,
            timeoutDuration: dynamicTimeout,
            complexityLevel: complexity.level
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

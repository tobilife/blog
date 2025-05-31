// 질문의 복잡도를 분석하는 함수 (LAG 방식 적용)
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
      useCache: level === 'simple',
      searchLimit: level === 'simple' ? 0 : level === 'moderate' ? 3 : 5,
      enhancePrompt: level !== 'simple'
    }
  };
}

// 질문의 주제를 분석하는 함수
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
    /최신.*뉴스/,
    /최근.*동향/,
    /요즘.*트렌드/,
    /github.*트렌드/,
    /github.*토픽/,
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

// 검색이 필요한 키워드를 확인하는 함수 (기존 함수 유지)
function shouldSearchWeb(query) {
  const intent = analyzeQueryIntent(query);
  return intent.needsSearch;
}

// 간단한 인메모리 캐시 시스템
const queryCache = new Map();
const CACHE_TTL = 3600000; // 1시간
const MAX_CACHE_SIZE = 100;

function getCachedResponse(query) {
  const normalizedQuery = query.toLowerCase().trim();
  const cached = queryCache.get(normalizedQuery);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('Cache hit for query:', normalizedQuery);
    return cached.response;
  }
  
  if (cached) {
    queryCache.delete(normalizedQuery); // 만료된 캐시 삭제
  }
  
  return null;
}

function setCachedResponse(query, response) {
  const normalizedQuery = query.toLowerCase().trim();
  
  queryCache.set(normalizedQuery, {
    response: response,
    timestamp: Date.now()
  });
  
  // 캐시 크기 제한
  if (queryCache.size > MAX_CACHE_SIZE) {
    const firstKey = queryCache.keys().next().value;
    queryCache.delete(firstKey);
  }
  
  console.log(`Cache set for query: ${normalizedQuery}, total cache size: ${queryCache.size}`);
}

// 날씨 정보가 필요한지 확인하는 함수
function needsWeatherInfo(query) {
  // 더 정확한 날씨 키워드 패턴
  const weatherPatterns = [
    /날씨/,
    /기온/,
    /온도/,
    /\s비\s/,  // 공백으로 분리된 '비'
    /비가\s/,   // '비가' 로 시작
    /눈이\s/,   // '눈이' 로 시작
    /맑음/,
    /흐림/,
    /구름/,
    /바람/,
    /습도/,
    /미세먼지/,
    /황사/
  ];
  return weatherPatterns.some(pattern => pattern.test(query));
}

// 도시명을 추출하는 함수
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

// OpenWeatherMap API 호출 함수
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

// 검색 쿼리를 최적화하는 함수
function optimizeSearchQuery(query) {
  const intent = analyzeQueryIntent(query);
  
  // 날짜/시간 전용 질문
  if (intent.isDateTime) {
    return 'current date time Korea May 31 2025';
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
      optimizedQuery += ' May 31 2025';
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

// Brave Search API 호출 함수
async function searchBrave(query, apiKey) {
  const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';
  
  // 검색 쿼리 최적화
  const searchQuery = optimizeSearchQuery(query);
  
  try {
    const response = await fetch(`${BRAVE_API_URL}?q=${encodeURIComponent(searchQuery)}&count=5&freshness=pw`, {
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
    
    // 검색 결과를 간단하게 포맷
    if (data.web && data.web.results) {
      return data.web.results.slice(0, 3).map(result => ({
        title: result.title,
        description: result.description,
        url: result.url
      }));
    }
    
    return null;
  } catch (error) {
    console.error('Brave Search error:', error);
    return null;
  }
}

// 검색 결과를 프롬프트에 포함시키는 함수
function enhancePromptWithSearchResults(originalQuery, searchResults, weatherData, conversationHistory = []) {
  // 현재 날짜를 서버에서 직접 제공
  const now = new Date();
  const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9 한국 시간
  const year = koreaTime.getUTCFullYear();
  const month = koreaTime.getUTCMonth() + 1;
  const day = koreaTime.getUTCDate();
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][koreaTime.getUTCDay()];
  
  let enhancedPrompt = '';
  
  // 대화 맥락이 있는 경우 포함
  if (conversationHistory.length > 0) {
    enhancedPrompt += '이전 대화 내용:\n';
    // 최근 6개의 대화만 포함 (적절한 맥락 유지)
    const recentHistory = conversationHistory.slice(-6);
    recentHistory.forEach(msg => {
      enhancedPrompt += `${msg.role === 'user' ? '사용자' : 'AI'}: ${msg.content}\n`;
    });
    enhancedPrompt += '\n';
  }
  
  enhancedPrompt += `현재 사용자 질문: ${originalQuery}\n\n`;
  
  // 질문 의도 분석
  const intent = analyzeQueryIntent(originalQuery);
  
  // 날짜/시간 전용 질문인 경우
  if (intent.isDateTime) {
    enhancedPrompt += `현재 한국 시간: ${year}년 ${month}월 ${day}일 ${dayOfWeek}요일\n\n`;
    enhancedPrompt += '답변 지침:\n';
    enhancedPrompt += '- 위에 제공된 현재 한국 시간을 기준으로 정확히 답변하세요.\n';
    enhancedPrompt += '- 다른 정보를 추가하지 마세요.\n';
    return enhancedPrompt;
  }
  
  // 날씨 정보가 있는 경우
  if (weatherData) {
    enhancedPrompt += `[실시간 날씨 정보]\n`;
    enhancedPrompt += `${weatherData.city}의 현재 날씨:\n`;
    enhancedPrompt += `- 현재 기온: ${weatherData.temp}°C (체감 ${weatherData.feels_like}°C)\n`;
    enhancedPrompt += `- 최저/최고 기온: ${weatherData.temp_min}°C / ${weatherData.temp_max}°C\n`;
    enhancedPrompt += `- 날씨 상태: ${weatherData.description}\n`;
    enhancedPrompt += `- 습도: ${weatherData.humidity}%\n`;
    enhancedPrompt += `- 풍속: ${weatherData.wind_speed}m/s\n`;
    enhancedPrompt += `- 구름량: ${weatherData.clouds}%\n\n`;
  }
  
  // 검색 결과가 있는 경우
  if (searchResults && searchResults.length > 0) {
    enhancedPrompt += '다음은 최신 웹 검색 결과입니다:\n\n';
    
    searchResults.forEach((result, index) => {
      enhancedPrompt += `[검색결과 ${index + 1}]\n`;
      enhancedPrompt += `제목: ${result.title}\n`;
      enhancedPrompt += `내용: ${result.description}\n`;
      enhancedPrompt += `출처: ${result.url}\n\n`;
    });
  }
  
  enhancedPrompt += '답변 지침:\n';
  
  if (weatherData) {
    enhancedPrompt += '1. 위에 제공된 실시간 날씨 정보를 바탕으로 구체적으로 답변하세요.\n';
    enhancedPrompt += `2. "오늘 ${weatherData.city} 날씨는..." 형식으로 시작하여 제공된 모든 날씨 정보를 포함하세요.\n`;
    enhancedPrompt += '3. 일반적인 기후 설명이 아닌 위의 실시간 데이터만 사용하세요.\n';
  } else if (needsWeatherInfo(originalQuery)) {
    enhancedPrompt += '1. 날씨 정보를 요청했지만 실시간 데이터를 가져올 수 없었습니다.\n';
    enhancedPrompt += '2. "현재 실시간 날씨 정보를 확인할 수 없습니다"라고 명확히 알려주세요.\n';
  } else if (searchResults && searchResults.length > 0) {
    // 일반 검색 결과에 대한 지침
    enhancedPrompt += '1. 검색 결과를 바탕으로 사용자 질문에 직접적으로 답변하세요.\n';
    enhancedPrompt += '2. 검색 결과의 내용을 요약하여 제공하고, 출처를 명시하세요.\n';
    enhancedPrompt += '3. 사용자가 요청한 주제에 집중하여 답변하세요.\n';
    
    // GitHub 토픽 같은 특정 주제에 대한 추가 지침
    if (originalQuery.includes('github') || originalQuery.includes('깃허브')) {
      enhancedPrompt += '4. GitHub 트렌드나 토픽에 대해 구체적인 프로젝트 이름, 설명, 주요 기능을 포함하세요.\n';
    }
  }
  
  // 공통 지침
  enhancedPrompt += '\n공통 지침:\n';
  if (conversationHistory.length > 0) {
    enhancedPrompt += '- 이전 대화 내용을 참고하여 맥락에 맞게 답변하세요.\n';
  }
  enhancedPrompt += '- 웹사이트 방문이나 앱 사용을 권하지 마세요.\n';
  enhancedPrompt += '- 질문의 주제와 관련 없는 정보는 포함하지 마세요.';
  
  return enhancedPrompt;
}

export async function handler(event, context) {
  console.log('Langflow proxy called');
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
    
    console.log('Environment check:', {
      hasLangflow: !!API_TOKEN,
      hasBrave: !!BRAVE_API_KEY,
      hasOpenWeather: !!OPENWEATHER_API_KEY
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
    if (conversationHistory.length > 0) {
      console.log('Recent conversation context:');
      conversationHistory.slice(-6).forEach((msg, idx) => {
        console.log(`  [${idx}] ${msg.role}: ${msg.content.substring(0, 50)}...`);
      });
    }
    
    // LAG 방식: 복잡도 분석
    const complexity = analyzeQueryComplexity(userQuery);
    console.log('Query complexity:', complexity);
    
    // 단순한 질문의 경우 캐시 확인
    if (complexity.recommendations.useCache) {
      const cachedResponse = getCachedResponse(userQuery);
      if (cachedResponse) {
        console.log('Returning cached response');
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
            'X-Cache': 'HIT'
          },
          body: JSON.stringify(cachedResponse),
        };
      }
    }
    
    let searchResults = null;
    let weatherData = null;
    let enhancedQuery = userQuery;
    
    // 질문 의도 분석
    const intent = analyzeQueryIntent(userQuery);
    console.log('Query intent:', intent);
    
    // LAG 방식: 복잡도에 따른 선택적 처리
    const skipEnhancement = complexity.level === 'simple' && !intent.needsSearch && !intent.isWeather;
    
    if (!skipEnhancement) {
      // 날씨 정보가 필요한 경우
      if (OPENWEATHER_API_KEY && intent.isWeather) {
        const city = extractCity(userQuery);
        console.log('Weather requested for city:', city);
        
        if (city) {
          console.log(`Getting weather for ${city}...`);
          weatherData = await getWeather(city, OPENWEATHER_API_KEY);
          if (weatherData) {
            console.log('Weather data retrieved successfully');
          } else {
            console.log('Failed to retrieve weather data');
          }
        } else {
          console.log('No city found in query');
        }
      }
      
      // 검색이 필요한 경우 (복잡도에 따른 검색 제한 적용)
      if (BRAVE_API_KEY && intent.needsSearch && !weatherData && !intent.isDateTime && 
          complexity.recommendations.searchLimit > 0) {
        console.log('Searching web for additional context...');
        console.log('Original query:', userQuery);
        console.log('Search limit based on complexity:', complexity.recommendations.searchLimit);
        
        // 복잡도에 따른 검색 결과 수 조정
        const originalSearchBrave = searchBrave;
        searchBrave = async function(query, apiKey) {
          const results = await originalSearchBrave(query, apiKey);
          if (results) {
            return results.slice(0, complexity.recommendations.searchLimit);
          }
          return results;
        };
        
        searchResults = await searchBrave(userQuery, BRAVE_API_KEY);
        if (searchResults) {
          console.log(`Found ${searchResults.length} search results`);
          console.log('Optimized search query:', optimizeSearchQuery(userQuery));
        }
      }
    } else {
      console.log('Skipping enhancement for simple query');
    }
    
    // 날씨 데이터나 검색 결과가 있거나 대화 맥락이 있으면 프롬프트 향상
    if (weatherData || searchResults || conversationHistory.length > 0) {
      enhancedQuery = enhancePromptWithSearchResults(userQuery, searchResults, weatherData, conversationHistory);
      requestBody.hasSearchResults = !!(weatherData || searchResults);
    }
    
    // 향상된 쿼리로 요청 본문 업데이트
    requestBody.input_value = enhancedQuery;

    console.log('Forwarding to Langflow...');

    // Forward the request to Langflow with timeout (LAG: 복잡도에 따른 타임아웃)
    const controller = new AbortController();
    const dynamicTimeout = complexity.recommendations.timeout;
    console.log(`Using dynamic timeout: ${dynamicTimeout}ms for ${complexity.level} query`);
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

      // 응답에 검색 수행 여부 플래그 추가
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseText);
        if (requestBody.hasSearchResults) {
          parsedResponse.hasSearchResults = true;
        }
        
        // LAG: 단순한 질문의 응답은 캐시에 저장
        if (complexity.recommendations.useCache && !requestBody.hasSearchResults) {
          setCachedResponse(userQuery, parsedResponse);
        }
      } catch (e) {
        // JSON 파싱 실패 시 원본 반환
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: responseText,
        };
      }

      // LAG: 복잡도 정보를 헤더에 추가
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
        body: JSON.stringify(parsedResponse),
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

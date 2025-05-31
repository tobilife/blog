// 검색이 필요한 키워드를 확인하는 함수
function shouldSearchWeb(query) {
  const searchKeywords = [
    '최신', '현재', '요즘', '오늘', '어제', '최근',
    '2025년', '2025', '올해', '이번달', '이번주',
    '뉴스', '소식', '동향', '트렌드', '현황',
    '실시간', '지금', '업데이트', '발표', '발매'
  ];
  
  const lowerQuery = query.toLowerCase();
  return searchKeywords.some(keyword => lowerQuery.includes(keyword));
}

// 날씨 정보가 필요한지 확인하는 함수
function needsWeatherInfo(query) {
  const weatherKeywords = ['날씨', '기온', '온도', '비', '눈', '맑음', '흐림', '구름', '바람'];
  return weatherKeywords.some(keyword => query.includes(keyword));
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

// Brave Search API 호출 함수
async function searchBrave(query, apiKey) {
  const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';
  
  // 날짜/시간 관련 질문은 검색 쿼리 최적화
  let searchQuery = query;
  if (query.includes('오늘') || query.includes('날짜') || query.includes('몇월') || query.includes('몇일')) {
    // 영어로 검색하면 더 정확한 결과를 얻을 수 있음
    searchQuery = 'current date time Korea May 31 2025';
  }
  
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
function enhancePromptWithSearchResults(originalQuery, searchResults, weatherData) {
  // 현재 날짜를 서버에서 직접 제공
  const now = new Date();
  const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9 한국 시간
  const year = koreaTime.getUTCFullYear();
  const month = koreaTime.getUTCMonth() + 1;
  const day = koreaTime.getUTCDate();
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][koreaTime.getUTCDay()];
  
  let enhancedPrompt = `사용자 질문: ${originalQuery}\n\n`;
  
  // 날짜 관련 질문인 경우 서버 시간 제공
  if (originalQuery.includes('오늘') || originalQuery.includes('날짜') || originalQuery.includes('몇월') || originalQuery.includes('몇일')) {
    enhancedPrompt += `현재 한국 시간: ${year}년 ${month}월 ${day}일 ${dayOfWeek}요일\n\n`;
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
  }
  
  enhancedPrompt += '- 날짜 관련 질문에는 위에 제공된 "현재 한국 시간"을 기준으로 답변하세요.\n';
  enhancedPrompt += '- 웹사이트 방문이나 날씨 앱 사용을 권하지 마세요.\n';
  enhancedPrompt += '- 검색 결과를 인용할 때는 출처를 명시하세요.';
  
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
    
    console.log('User query:', userQuery);
    
    let searchResults = null;
    let weatherData = null;
    let enhancedQuery = userQuery;
    
    // 날씨 정보가 필요한 경우
    if (OPENWEATHER_API_KEY && needsWeatherInfo(userQuery)) {
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
    
    // 검색이 필요한 경우 (날씨 데이터가 없을 때만)
    if (BRAVE_API_KEY && shouldSearchWeb(userQuery) && !weatherData) {
      console.log('Searching web for additional context...');
      searchResults = await searchBrave(userQuery, BRAVE_API_KEY);
      if (searchResults) {
        console.log(`Found ${searchResults.length} search results`);
      }
    }
    
    // 날씨 데이터나 검색 결과가 있으면 프롬프트 향상
    if (weatherData || searchResults) {
      enhancedQuery = enhancePromptWithSearchResults(userQuery, searchResults, weatherData);
      requestBody.hasSearchResults = true;
    }
    
    // 향상된 쿼리로 요청 본문 업데이트
    requestBody.input_value = enhancedQuery;

    console.log('Forwarding to Langflow...');

    // Forward the request to Langflow with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9500); // 9.5초 타임아웃

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

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
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

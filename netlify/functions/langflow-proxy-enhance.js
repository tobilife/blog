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
    enhancedPrompt += '2. "오늘 ${city} 날씨는..." 형식으로 시작하여 제공된 모든 날씨 정보를 포함하세요.\n';
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

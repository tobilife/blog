# 토비라이프 블로그 - 웹 검색 기능 추가 프로젝트

## 프로젝트 개요
- **목표**: LLM 응답에 최신 정보 제공을 위한 웹 검색 기능 추가
- **현재 상태**: Langflow + qwen-qwq-32b 모델 사용 중
- **제약사항**: Netlify 무료 플랜 (10초 타임아웃)

## 현재 구조
1. **Frontend**: Astrofy + Svelte 컴포넌트
   - `/src/components/chat/LangflowChatSimple.svelte`
   
2. **Backend**: Netlify Functions
   - `/netlify/functions/langflow-proxy.js`
   - Langflow API 프록시 역할
   
3. **API**: 
   - Langflow API (qwen-qwq-32b 모델 연결)
   - Brave Search API (환경변수 설정됨: BRAVE_SEARCH_API_KEY)

## 구현 옵션
1. **옵션 A**: Langflow Flow 수정
   - 장점: 깔끔한 구조
   - 단점: Langflow 수정 필요

2. **옵션 B**: Netlify Function에서 처리 ⭐ 추천
   - 장점: 기존 구조 유지, API 키 보호
   - 단점: 응답 시간 증가 가능

## 진행 상황
- [x] 프로젝트 구조 파악
- [x] 현재 LLM 호출 방식 확인
- [x] 구현 방식 결정 (옵션 B)
- [x] Brave Search API 통합 코드 작성
- [x] 클라이언트 UI 업데이트
- [x] 1차 테스트 및 개선
- [ ] 배포 및 최종 테스트

## 구현 세부사항
### Netlify Function 수정 내용
- 검색 트리거 키워드: '최신', '현재', '2025년', '오늘', '요즘' 등
- Brave Search API 호출 (상위 3개 결과)
- 검색 결과를 LLM 프롬프트에 포함
- 응답에 hasSearchResults 플래그 추가

### 클라이언트 수정 내용
- 검색 수행 여부 확인 로직 추가
- 초기 환영 메시지에 검색 기능 안내

## 개선 사항 (2차)
### 날짜/시간 질문 처리 개선
- 서버에서 직접 현재 한국 시간 제공 (UTC+9)
- 검색 쿼리를 영어로 변경
- Brave Search API에 freshness 파라미터 추가
- 프롬프트에 명확한 날짜 답변 지침 추가

## 테스트 예시 질문
- "최신 AI 뉴스 알려줘"
- "2025년 트렌드가 뭐야?"
- "오늘 한국시간으로 몇월 몇일이야?"
- "현재 비트코인 가격"
- "오늘 고양시 날씨 어때?"
- "서울 날씨 알려줘"

## 개선 사항 (3차) - OpenWeatherMap API 추가
- OpenWeatherMap API 통합 (환경변수: OPENWEATHER_API_KEY)
- 한국 주요 도시 날씨 정보 제공
- 현재 기온, 체감 온도, 습도, 풍속 등 상세 정보
- 날씨 관련 키워드 자동 감지
### 필요한 설정
1. OpenWeatherMap 가입 (https://openweathermap.org/)
2. 무료 API 키 발급
3. Netlify 환경변수에 OPENWEATHER_API_KEY 추가
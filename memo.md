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

## 개선 사항 (4차) - 질문 주제 분석 로직 개선
### 문제점
- "오늘 github 토픽 요약해줘" 같은 복합 질문에서 날짜/시간 쿼리로 잘못 변환
- 주제와 관련 없는 검색 결과 반환

### 해결 방안
1. **analyzeQueryIntent() 함수 추가**
   - 날짜/시간 전용 패턴 감지
   - 날씨 전용 패턴 감지
   - 일반 검색 패턴 감지
   - 복합 질문 처리

2. **optimizeSearchQuery() 함수 추가**
   - GitHub 관련 키워드 영어 변환
   - 한글 키워드를 영어로 자동 변환
   - 컨텍스트 기반 검색어 최적화

3. **프롬프트 향상 로직 개선**
   - 질문 의도에 따른 맞춤형 지침 제공
   - GitHub 관련 질문에 특화된 지침 추가

## 개선 사항 (5차) - LAG 방식 적용
### LAG (Layer-wise Adaptive Gating) 방식 구현
- LLM의 레이어별 실행 제어 개념을 차용한 적응형 처리 시스템
- 질문 복잡도에 따른 동적 리소스 할당

### 구현 내용
1. **질문 복잡도 분석 시스템 (analyzeQueryComplexity)**
   - 단어 수, 다중 질문, 추론 필요성 등 분석
   - 복잡도 점수 계산 (simple/moderate/complex)
   - 처리 권장사항 제공 (타임아웃, 캐시, 검색 제한)

2. **인메모리 캐싱 시스템**
   - 단순한 질문 응답 캐싱 (1시간 TTL)
   - 최대 100개 항목 저장
   - 캐시 히트시 즉시 반환

3. **동적 타임아웃 설정**
   - Simple: 5초
   - Moderate: 7초
   - Complex: 9.5초

4. **선택적 API 호출**
   - 단순 질문: API 호출 생략
   - 중간 복잡도: 필요한 API만 호출
   - 복잡한 질문: 모든 API 호출

5. **성능 모니터링**
   - 응답 헤더에 복잡도 정보 추가
   - X-Query-Complexity: 복잡도 레벨
   - X-Query-Score: 복잡도 점수
   - X-Response-Time: 응답 시간
   - X-Cache: 캐시 히트 여부

### 예상 효과
- 단순 질문 응답 시간 30-50% 단축
- API 호출 비용 절감
- 서버 부하 감소
- 사용자 경험 개선
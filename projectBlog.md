# Blog 프로젝트 아키텍처 문서

## 📋 프로젝트 개요

이 프로젝트는 Astro 기반의 개인 블로그 시스템으로, TypeScript와 Svelte를 사용하여 구축되었습니다. 정적 사이트 생성(SSG) 방식을 채택하여 빠른 로딩 속도와 SEO 최적화를 달성했습니다.

### 주요 특징
- **프레임워크**: Astro 5.9.0
- **UI 라이브러리**: Svelte 5.33.0
- **스타일링**: Tailwind CSS 3.4.17
- **배포**: Netlify
- **버전 관리**: Git (GitHub)
- **패키지 매니저**: pnpm 10.11.0
- **코드 품질**: Biome (린터 & 포맷터)

## 🏗️ 프로젝트 구조

```
D:\dev\blog\
├── .astro/                    # Astro 빌드 캐시
├── .github/                   # GitHub Actions 워크플로우
├── .vscode/                   # VS Code 설정
├── dist/                      # 빌드 출력 디렉토리
├── docs/                      # 프로젝트 문서
├── netlify/                   # Netlify 함수 및 Edge Functions
│   ├── edge-functions/        # Edge Functions
│   └── functions/             # Serverless Functions
├── node_modules/              # 의존성 패키지
├── public/                    # 정적 자산
│   ├── fonts/                 # 웹 폰트
│   ├── images/                # 이미지 파일
│   └── js/                    # 정적 JavaScript
├── scripts/                   # 빌드/유틸리티 스크립트
├── src/                       # 소스 코드
│   ├── components/            # UI 컴포넌트
│   ├── constants/             # 상수 정의
│   ├── content/               # 콘텐츠 정의
│   ├── i18n/                  # 다국어 지원
│   ├── layouts/               # 레이아웃 컴포넌트
│   ├── pages/                 # 페이지 라우트
│   ├── plugins/               # 커스텀 플러그인
│   ├── scripts/               # 클라이언트 스크립트
│   ├── styles/                # 글로벌 스타일
│   ├── types/                 # TypeScript 타입 정의
│   └── utils/                 # 유틸리티 함수
├── astro.config.mjs           # Astro 설정
├── biome.json                 # Biome 린터/포맷터 설정
├── netlify.toml               # Netlify 배포 설정
├── package.json               # 프로젝트 메타데이터
├── tailwind.config.cjs        # Tailwind CSS 설정
└── tsconfig.json              # TypeScript 설정
```

## 🛠️ 기술 스택 상세

### 1. 프론트엔드 프레임워크

#### Astro
- **버전**: 5.9.0
- **역할**: 정적 사이트 생성, 라우팅, 빌드 최적화
- **특징**:
  - Islands Architecture로 선택적 하이드레이션
  - 다중 프레임워크 지원 (Svelte 통합)
  - 마크다운 기반 콘텐츠 관리

#### Svelte
- **버전**: 5.33.0
- **역할**: 인터랙티브 UI 컴포넌트
- **주요 컴포넌트**:
  - `Search.svelte`: 검색 기능
  - `LightDarkSwitch.svelte`: 다크모드 토글

### 2. 스타일링

#### Tailwind CSS
- **버전**: 3.4.17
- **설정**: `tailwind.config.cjs`
- **플러그인**:
  - `@tailwindcss/typography`: 마크다운 콘텐츠 스타일링
  - PostCSS 중첩(nesting) 지원

### 3. 콘텐츠 처리

#### Markdown 처리 파이프라인
```
Markdown → Remark 플러그인 → Rehype 플러그인 → HTML
```

**Remark 플러그인**:
- `remark-math`: 수식 지원
- `remark-reading-time`: 읽기 시간 계산
- `remark-excerpt`: 요약 추출
- `remark-directive`: 커스텀 디렉티브
- `remark-github-admonitions-to-directives`: GitHub 스타일 경고문

**Rehype 플러그인**:
- `rehype-katex`: LaTeX 수식 렌더링
- `rehype-slug`: 헤딩 ID 생성
- `rehype-autolink-headings`: 헤딩 앵커 링크
- `rehype-components`: 커스텀 컴포넌트 렌더링

### 4. 검색 기능

#### Pagefind
- **역할**: 정적 사이트 전문 검색
- **설정**: `pagefind.yml`
- **특징**: 빌드 시 검색 인덱스 생성

### 5. 배포 및 인프라

#### Netlify
- **설정**: `netlify.toml`
- **기능**:
  - Edge Functions: SEO 최적화, 크롤러 처리
  - Serverless Functions: API 엔드포인트
  - 자동 배포: GitHub 연동

## 📦 주요 디렉토리 상세

### `/src/components/`
UI 컴포넌트를 기능별로 구성:
- `chat/`: 채팅 관련 컴포넌트
- `control/`: 제어 UI 컴포넌트
- `misc/`: 기타 유틸리티 컴포넌트
- `ui/`: 기본 UI 컴포넌트
- `widget/`: 위젯 컴포넌트

### `/src/pages/`
Astro의 파일 기반 라우팅:
- `[...page].astro`: 동적 페이지네이션
- `posts/`: 블로그 포스트 페이지
- `archive/`: 아카이브 페이지
- `about.astro`: 소개 페이지
- `404.astro`, `500.astro`: 에러 페이지

### `/src/content/`
콘텐츠 컬렉션:
- `posts/`: 블로그 포스트 마크다운
- `spec/`: 스펙 문서
- `config.ts`: 콘텐츠 스키마 정의

### `/netlify/` - Netlify 서버리스 기능 상세

#### Edge Functions 디렉토리 (`/netlify/edge-functions/`)

Netlify Edge Functions는 Deno 기반으로 전 세계 CDN 엣지에서 실행되는 함수들입니다.

##### 1. `social-crawler-handler.js`
**목적**: 소셜 미디어 크롤러(카카오톡, 네이버, 페이스북 등)를 위한 최적화된 HTML 응답 제공

**주요 기능**:
- **크롤러 감지**: User-Agent를 통해 소셜 미디어 봇 식별
  - 카카오톡/카카오스토리
  - 네이버 (NaverBot-Scrap, Yeti)
  - 페이스북 (facebookexternalhit)
  - 트위터, 링크드인, 슬랙, 디스코드 등
- **메타데이터 캐싱**: 포스트 메타데이터를 5분간 캐싱하여 성능 최적화
- **동적 Open Graph 태그 생성**: 각 포스트별로 최적화된 OG 태그 생성
- **폴백 HTML 제공**: 타임아웃이나 오류 시에도 기본 메타데이터 제공
- **성능 최적화**: 카카오/네이버는 5초, 기타는 8초 타임아웃 적용

**기술적 특징**:
- posts-metadata.json 파일을 읽어 포스트별 메타정보 제공
- 구조화된 데이터(JSON-LD) 포함
- 카카오 전용 메타 태그 지원

##### 2. `langflow-proxy-edge.ts`
**목적**: AI 챗봇 서비스를 위한 고성능 프록시 (TypeScript)

**주요 기능**:
- **응답 품질 평가**: ResponseQualityEvaluator 클래스를 통한 AI 응답 품질 평가
  - 완성도, 관련성, 구조, 참조, 길이 기준 평가
  - 0.7 이상의 품질 점수만 캐싱
- **Astra DB 캐싱**: 고품질 응답만 선별적으로 캐싱
  - TTL: 1시간
  - 품질 점수 및 신뢰도 레벨 저장
- **API 사용량 추적**: 일별/월별 API 사용량 관리
  - Google: 일일 99회 제한
  - Brave/Tavily: 월 1000회 제한
- **웹 검색 통합**: 세 가지 검색 API 지능적 활용
  - Google Custom Search (우선순위 1)
  - Brave Search (우선순위 2)
  - Tavily Search (우선순위 3)
- **질문 복잡도 분석**: 질문 난이도에 따른 처리 전략 조정
- **중국어 문자 제거**: 응답에서 불필요한 중국어 문자 자동 제거

**성능 최적화**:
- Edge Functions의 60초 타임아웃 활용 (55초 설정)
- 병렬 검색 처리로 응답 시간 단축
- 캐시 히트 시 즉시 응답

##### 3. `googlebot-handler.js`
**목적**: Googlebot 크롤러를 위한 최적화된 응답 처리

**주요 기능**:
- Googlebot User-Agent 감지 및 특별 처리
- SEO 최적화된 헤더 설정
- 크롤링 성능 최적화

##### 4. `health-check.js`
**목적**: 서비스 상태 모니터링

**주요 기능**:
- `/health` 엔드포인트에서 서비스 상태 확인
- 업타임 모니터링 지원

##### 5. `test-cache.ts`
**목적**: 캐시 시스템 테스트 및 디버깅

#### Functions 디렉토리 (`/netlify/functions/`)

Netlify Functions는 AWS Lambda 기반의 서버리스 함수들입니다.

##### 1. `langflow-proxy-astra.js`
**목적**: AI 챗봇 서비스의 메인 백엔드 프록시

**주요 기능**:
- **질문 분석 시스템**:
  - 복잡도 분석: 단순/중간/복잡 레벨 구분
  - 의도 분석: 날짜/시간, 날씨, 블로그 관련, 웹 검색 필요 여부 판단
- **캐싱 전략**:
  - Astra DB를 통한 영구 캐싱
  - 복잡도와 대화 길이를 고려한 캐시 키 생성
- **검색 최적화**:
  - Google 우선, 실패 시 Brave/Tavily 병렬 검색
  - 검색 쿼리 최적화 (한글→영어 변환)
  - 월별 사용량 추적 및 제한
- **날씨 정보 통합**: OpenWeatherMap API 연동
- **프롬프트 엔지니어링**: 검색 결과를 효과적으로 AI에 전달

**기술적 특징**:
- 9.5초 타임아웃 (Netlify 10초 제한 고려)
- 비동기 처리 준비 (현재 비활성화)
- 토큰 최적화를 위한 응답 압축

##### 2. `astra-cache-service.js`
**목적**: Astra DB 캐시 서비스 관리

**주요 기능**:
- 캐시 CRUD 작업
- TTL 기반 만료 처리
- 캐시 통계 수집

##### 3. `async-task-queue.js`
**목적**: 비동기 작업 큐 관리

**주요 기능**:
- 긴 처리 시간이 필요한 작업의 비동기 처리
- 작업 상태 추적
- 작업 결과 저장

##### 4. `cache-management.js`
**목적**: 캐시 관리 도구

**주요 기능**:
- 캐시 통계 조회
- 캐시 무효화
- 캐시 정리 작업

##### 5. `check-task-status.js`
**목적**: 비동기 작업 상태 확인

**주요 기능**:
- 작업 ID로 처리 상태 조회
- 완료된 작업 결과 반환

##### 6. `update-feedback.js`
**목적**: 사용자 피드백 처리

**주요 기능**:
- AI 응답에 대한 사용자 피드백 수집
- 품질 개선을 위한 데이터 저장

##### 7. `web-search.js`
**목적**: 웹 검색 전용 서비스

**주요 기능**:
- 독립적인 웹 검색 API
- 검색 결과 포맷팅

##### 8. `utils/` 디렉토리
**목적**: 공통 유틸리티 함수들

**포함 내용**:
- `cache-service.js`: Astra DB 캐시 연결 및 작업
- `async-task-service.js`: 비동기 작업 처리 로직
- 기타 헬퍼 함수들

#### Netlify 설정 (`netlify.toml`)

**빌드 설정**:
```toml
[build]
  command = "pnpm build"
  publish = "dist"
  NODE_VERSION = "18"
```

**Edge Functions 라우팅**:
1. `social-crawler-handler`: 모든 경로에서 소셜 크롤러 감지
2. `googlebot-handler`: Google 봇 전용 처리
3. `health-check`: `/health` 엔드포인트
4. `langflow-proxy-edge`: `/api/chat` AI 챗봇 API

**보안 헤더**:
- X-Frame-Options: 클릭재킹 방지
- X-Content-Type-Options: MIME 타입 스니핑 방지
- X-XSS-Protection: XSS 공격 방지

**리다이렉트 규칙**:
- `/api/langflow/*` → Astra 프록시 함수
- 이미지 경로 호환성 유지

#### 환경 변수 요구사항

**필수 환경 변수**:
- `LANGFLOW_API_TOKEN`: Langflow AI 서비스 인증
- `ASTRA_DB_REST_URL`: Astra DB REST API URL
- `ASTRA_DB_APPLICATION_TOKEN`: Astra DB 인증 토큰
- `ASTRA_DB_KEYSPACE`: Astra DB 키스페이스

**선택적 환경 변수**:
- `GOOGLE_SEARCH_API_KEY`: Google Custom Search API
- `GOOGLE_SEARCH_CX`: Google Search Engine ID
- `BRAVE_SEARCH_API_KEY`: Brave Search API
- `TAVILY_API_KEY`: Tavily Search API
- `OPENWEATHER_API_KEY`: OpenWeatherMap API

#### 성능 및 확장성

**Edge Functions 장점**:
- 전 세계 CDN 엣지에서 실행 (낮은 지연시간)
- Deno 런타임 (보안성 높음)
- 60초 타임아웃 (일반 Functions의 6배)

**Functions 장점**:
- AWS Lambda 기반 (안정성)
- Node.js 환경 (npm 패키지 사용 가능)
- 복잡한 백엔드 로직 처리

**최적화 전략**:
1. 캐싱을 통한 응답 시간 단축
2. API 사용량 추적으로 비용 관리
3. 품질 평가를 통한 캐시 효율성 향상
4. 병렬 처리로 검색 성능 개선

### 빌드 파이프라인
```bash
pnpm build
```

1. **사전 빌드**:
   - `build-knowledge-base.js`: 지식 베이스 구축
   - `build-posts-metadata.js`: 포스트 메타데이터 생성

2. **Astro 빌드**:
   - 정적 페이지 생성
   - 자산 최적화
   - 컴포넌트 번들링

3. **사후 빌드**:
   - Pagefind 검색 인덱스 생성
   - `postbuild.js`: 추가 처리

## 🎨 코드 스타일 가이드

### Biome 설정 (biome.json)
- **들여쓰기**: 탭 (너비 2)
- **따옴표**: 큰따옴표 (`"`)
- **세미콜론**: 필수
- **Trailing Comma**: 항상 사용
- **Import 정렬**: 알파벳순

### 린팅 규칙
- `noForEach`: forEach 대신 for...of 사용
- `useOptionalChain`: && 체이닝 대신 ?. 사용
- `noConsoleLog`: console.log 경고
- `useTemplate`: 템플릿 리터럴 권장

## 🌐 국제화 (i18n)

### 지원 언어
- 한국어 (ko)
- 영어 (en)
- 일본어 (ja-JP)
- 중국어 (zh-CN)
- 태국어 (th)
- 스페인어 (es)

### 구현
- `/src/i18n/`: 언어별 번역 파일
- 다국어 README 파일 제공

## 📱 주요 기능

### 1. 블로그 포스트
- 마크다운 기반 작성
- 카테고리 및 태그 분류
- 읽기 시간 표시
- 관련 포스트 추천

### 2. 검색
- 전문 검색 (Pagefind)
- 실시간 검색 결과
- 한국어 형태소 분석 지원

### 3. 다크 모드
- 시스템 설정 연동
- 수동 토글 지원
- 테마 지속성

### 4. SEO 최적화
- 메타 태그 자동 생성
- Open Graph 지원
- 사이트맵 자동 생성
- 구조화된 데이터

### 5. 성능 최적화
- 이미지 최적화 (Sharp)
- 지연 로딩
- 코드 분할
- SWUP 페이지 전환

## 🚀 개발 워크플로우

### 개발 서버
```bash
pnpm dev        # Astro 개발 서버
pnpm dev:netlify # Netlify CLI 개발 서버
```

### 새 포스트 작성
```bash
pnpm new-post
```

### 코드 품질 관리
```bash
pnpm lint       # Biome 린팅
pnpm format     # Biome 포맷팅
pnpm type-check # TypeScript 타입 체크
```

## 📈 모니터링 및 분석

### 성능 모니터링
- Lighthouse 점수 최적화
- Core Web Vitals 추적

### 에러 추적
- 클라이언트 에러 로깅
- 서버리스 함수 모니터링

## 🔒 보안

### HTTP 헤더
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block

### 콘텐츠 보안
- 사용자 입력 새니타이즈
- XSS 방어
- CSRF 보호

## 📚 추가 문서

- `README.md`: 프로젝트 소개 및 시작 가이드
- `Biome-린터-포맷터-프로젝트-지침.md`: 코드 스타일 가이드
- `mcp사용가이드.md`: MCP 도구 사용법
- `memo.md`: 개발 메모

## 🔄 업데이트 및 유지보수

### 의존성 관리
- pnpm 워크스페이스 사용
- 정기적인 의존성 업데이트
- 보안 취약점 모니터링

### 배포 전략
- main 브랜치 자동 배포
- Pull Request 미리보기 배포
- 롤백 지원

## Astra DB
- USE chat_data;
- TRUNCATE TABLE chat_cache;
- SELECT * FROM chat_cache;
- SELECT * FROM api_usage_stats;
---



## 개선 사항
INP 성능 개선을 위한 리팩토링 전략
문제 분석

Processing duration 425ms - JavaScript 실행이 메인 스레드를 과도하게 블로킹
다수의 포인터 이벤트 - 네비게이션 바의 여러 인터랙티브 요소들이 성능 병목
모바일에서 더 심각 - 리소스가 제한된 환경에서 문제 증폭

주요 병목 지점

Search 컴포넌트 - Pagefind 검색 시 동기적 처리
LightDarkSwitch - DOM 조작과 클래스 토글
NavMenuPanel - 애니메이션과 DOM 접근
DisplaySettings - 실시간 색상 변경

리팩토링 전략
1. 이벤트 핸들러 최적화

Passive 이벤트 리스너 사용
이벤트 위임(Event Delegation) 적용
requestAnimationFrame을 통한 DOM 업데이트 배치 처리

2. 검색 기능 최적화

Web Worker로 검색 로직 분리
Virtual scrolling으로 대량 결과 처리
더 긴 debounce 시간 적용

3. 애니메이션 최적화

CSS transform/opacity만 사용
will-change 속성 적절히 활용
GPU 가속 활용

4. 코드 분할 및 지연 로딩

무거운 컴포넌트 동적 임포트
Intersection Observer로 필요시 로드

5. 상태 관리 최적화

불필요한 리렌더링 방지
메모이제이션 적용

Swup 자동 프리로드 비활성화

window.swup.options.preload = false로 모든 링크의 자동 프리로드 차단
태그, 카테고리, 홈 등 불필요한 페이지 프리페치 방지


포스트 전용 프리로드

/posts/로 시작하는 링크만 프리로드
150ms 디바운스로 실수로 호버한 경우 방지
중복 프리페치 방지 로직


data-swup-preload 속성 제거

PostCard와 Navbar에서 모든 data-swup-preload 속성 제거
수동으로 제어하여 정확한 프리로드 관리



성능 개선 효과:

네트워크 트래픽 감소

태그/카테고리 페이지 불필요한 프리페치 제거
포스트 페이지만 선택적으로 프리로드


메모리 사용량 감소

불필요한 페이지 캐싱 방지
캐시 크기 50개로 제한


더 나은 사용자 경험

정말 필요한 페이지만 미리 로드
더 빠른 포스트 페이지 전환
리소스 낭비 없음


마우스 호버 시:
포스트 링크: 프리페치 수행 (사용자가 클릭할 가능성 높음)
태그/카테고리 링크: 프리페치 안함 (불필요한 리소스 절약)
301 리다이렉트 제거: trailing slash 처리로 직접 접근
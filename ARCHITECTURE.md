# 토비라이프 블로그 아키텍처 문서

## 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [기술 스택](#기술-스택)
3. [프로젝트 구조](#프로젝트-구조)
4. [핵심 컴포넌트](#핵심-컴포넌트)
5. [데이터 흐름](#데이터-흐름)
6. [챗봇 시스템 구조](#챗봇-시스템-구조)
7. [배포 프로세스](#배포-프로세스)
8. [성능 최적화](#성능-최적화)
9. [개발 가이드라인](#개발-가이드라인)

## 프로젝트 개요

토비라이프 블로그는 Astro 기반의 정적 사이트 생성기(SSG)를 사용하여 구축된 개인 기술 블로그입니다. AI 챗봇 기능, 다국어 지원, 고성능 최적화가 특징이며, Netlify에서 호스팅됩니다.

### 주요 특징
- **정적 사이트 생성**: Astro SSG를 활용한 빠른 로딩 속도
- **AI 챗봇 통합**: Langflow 기반의 지능형 블로그 어시스턴트
- **다국어 지원**: 한국어, 영어, 일본어, 중국어 등 7개 언어 지원
- **반응형 디자인**: 모바일 우선 설계
- **성능 최적화**: 이미지 최적화, 코드 분할, 캐싱 전략 적용

## 기술 스택

### 프론트엔드
- **프레임워크**: Astro 5.9.3
- **UI 프레임워크**: Svelte 5.33.0 (Svelte 4 호환 모드)
- **스타일링**: Tailwind CSS 3.4.17
- **타입스크립트**: TypeScript 5.8.3

### 빌드 도구
- **패키지 매니저**: pnpm 10.11.0
- **린터/포매터**: Biome 1.9.4
- **번들러**: Vite (Astro 내장)

### 백엔드/서버리스
- **엣지 함수**: Netlify Edge Functions
- **서버리스 함수**: Netlify Functions
- **API 프록시**: Express 5.1.0

### AI/ML
- **챗봇 백엔드**: Langflow
- **벡터 데이터베이스**: Astra DB
- **자연어 처리**: Korean-text-analytics

### 검색/인덱싱
- **사이트 내 검색**: Pagefind 1.3.0
- **퍼지 검색**: Fuse.js 7.1.0

## 프로젝트 구조

```
D:\dev\blog\
├── .astro/                 # Astro 빌드 캐시
├── dist/                   # 빌드 출력 디렉토리
├── netlify/               # Netlify 함수 및 설정
│   ├── edge-functions/    # Edge Functions
│   └── functions/         # Serverless Functions
├── public/                # 정적 자산
│   ├── fonts/            # 웹 폰트
│   ├── images/           # 이미지 자산
│   └── js/               # 정적 JavaScript
├── scripts/               # 빌드/유틸리티 스크립트
├── src/                   # 소스 코드
│   ├── components/        # UI 컴포넌트
│   ├── config.ts         # 사이트 설정
│   ├── constants/        # 상수 정의
│   ├── content/          # 콘텐츠 파일
│   ├── i18n/             # 다국어 설정
│   ├── layouts/          # 레이아웃 컴포넌트
│   ├── pages/            # 페이지 라우트
│   ├── plugins/          # Markdown 플러그인
│   ├── scripts/          # 클라이언트 스크립트
│   ├── styles/           # 글로벌 스타일
│   ├── types/            # TypeScript 타입
│   └── utils/            # 유틸리티 함수
└── 설정 파일들
    ├── astro.config.mjs   # Astro 설정
    ├── biome.json         # Biome 린터 설정
    ├── netlify.toml       # Netlify 배포 설정
    ├── package.json       # 프로젝트 메타데이터
    ├── tailwind.config.cjs # Tailwind 설정
    └── tsconfig.json      # TypeScript 설정
```

## 핵심 컴포넌트

### 1. 페이지 컴포넌트
- **[...page].astro**: 홈페이지 및 페이지네이션
- **posts/[...slug].astro**: 블로그 포스트 상세 페이지
- **archive/**: 카테고리, 태그별 아카이브
- **about.astro**: 소개 페이지

### 2. 레이아웃 컴포넌트
- **Layout.astro**: 기본 HTML 레이아웃
- **MainGridLayout.astro**: 메인 그리드 레이아웃 (사이드바 포함)

### 3. UI 컴포넌트
- **Navbar.astro**: 상단 네비게이션
- **PostCard.astro**: 포스트 카드 컴포넌트
- **Search.svelte**: 사이트 내 검색
- **LightDarkSwitch.svelte**: 다크모드 토글

### 4. 위젯 컴포넌트
- **Profile.astro**: 프로필 위젯
- **Categories.astro**: 카테고리 목록
- **Tags.astro**: 태그 클라우드
- **TOC.astro**: 목차 (Table of Contents)

### 5. 챗봇 컴포넌트
- **LangflowChatAstra.svelte**: 메인 챗봇 UI
- **BlogRAGService.js**: RAG 기반 블로그 검색
- **IntentClassifier.js**: 사용자 의도 분류
- **KoreanNLPService.js**: 한국어 자연어 처리

## 데이터 흐름

### 1. 콘텐츠 처리 플로우
```
Markdown 파일 → Remark 플러그인 → Rehype 플러그인 → HTML 생성 → 페이지 렌더링
```

### 2. 빌드 프로세스
```
1. build-knowledge-base.js: 지식 베이스 구축
2. build-posts-metadata.js: 포스트 메타데이터 생성
3. build-site-config.js: 사이트 설정 빌드
4. astro build: 정적 사이트 생성
5. pagefind: 검색 인덱스 생성
6. postbuild.js: 후처리 작업
7. generate-sw-manifest.js: 서비스 워커 매니페스트 생성
```

### 3. 런타임 데이터 플로우
- **정적 콘텐츠**: CDN에서 직접 제공
- **동적 콘텐츠**: Edge Functions를 통한 처리
- **API 요청**: Netlify Functions를 통한 프록시

## 챗봇 시스템 구조

### 1. 아키텍처 개요
```
사용자 입력 → Intent Classifier → Service Router → Response Generator → 사용자 응답
                                         ↓
                                   [Blog RAG Service]
                                   [Web Search Service]
                                   [Feedback Service]
```

### 2. 핵심 서비스
- **BlogRAGService**: 블로그 콘텐츠 기반 검색 및 응답
- **IntentClassifier**: 사용자 의도 분류 (블로그 검색, 일반 질문 등)
- **KoreanNLPService**: 한국어 토큰화 및 형태소 분석
- **ChainOfThoughtService**: 복잡한 질문에 대한 단계별 추론
- **OptimizedChatService**: 캐싱 및 최적화된 응답 처리

### 3. 데이터 저장
- **Astra DB**: 벡터 임베딩 및 대화 이력 저장
- **LocalStorage**: 클라이언트 측 캐싱
- **Edge KV**: Edge Function 레벨 캐싱

## 배포 프로세스

### 1. CI/CD 파이프라인
```
GitHub Push → Netlify 빌드 트리거 → 빌드 프로세스 → 배포 → CDN 무효화
```

### 2. Netlify 설정
- **빌드 명령어**: `pnpm build`
- **퍼블리시 디렉토리**: `dist`
- **Node 버전**: 18
- **캐시 버전**: v2

### 3. Edge Functions
- **social-preview**: 소셜 미디어 프리뷰 처리
- **googlebot-handler**: 검색 엔진 최적화
- **langflow-proxy-edge**: 챗봇 API 프록시
- **cache-invalidator**: 캐시 무효화

## 성능 최적화

### 1. 이미지 최적화
- Sharp를 통한 이미지 변환 및 압축
- WebP 포맷 자동 변환
- 반응형 이미지 생성

### 2. 코드 최적화
- 컴포넌트 레벨 코드 분할
- Tree shaking 및 Dead code elimination
- 중요 리소스 사전 로딩

### 3. 캐싱 전략
- 정적 자산: 1년 캐싱 (immutable)
- HTML: 1시간 캐싱
- API 응답: 5분 캐싱

### 4. 모바일 최적화
- Critical CSS 인라인화
- 폰트 사전 로딩
- 터치 이벤트 최적화

## 개발 가이드라인

### 1. 코드 스타일
- **린터**: Biome 사용 (ESLint 대체)
- **포매터**: 탭 들여쓰기, 120자 라인 제한
- **타입스크립트**: 엄격한 타입 체크 활성화

### 2. 컴포넌트 규칙
- Astro 컴포넌트: 정적 콘텐츠 및 레이아웃
- Svelte 컴포넌트: 인터랙티브 UI
- 컴포넌트 파일명: PascalCase 사용

### 3. 커밋 규칙
- 기능별 작은 단위로 커밋
- 의미 있는 커밋 메시지 작성
- 빌드 실패 커밋 금지

### 4. 성능 모니터링
- Lighthouse CI 통합
- Core Web Vitals 추적
- 번들 크기 모니터링

### 5. 보안 가이드라인
- 환경 변수로 민감한 정보 관리
- XSS 방지를 위한 콘텐츠 살균
- CORS 정책 엄격히 적용

## 향후 개선 사항

1. **PWA 지원**: 오프라인 모드 및 앱 설치 기능
2. **실시간 분석**: 방문자 분석 대시보드
3. **콘텐츠 추천**: AI 기반 관련 포스트 추천
4. **다중 언어 챗봇**: 영어 등 추가 언어 지원
5. **성능 향상**: Edge 렌더링 도입 검토
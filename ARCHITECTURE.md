# Blog 프로젝트 아키텍처 문서

## 📋 프로젝트 개요

이 프로젝트는 Astro 5.9.0 기반의 개인 블로그 시스템으로, TypeScript와 Svelte를 사용하여 구축되었습니다. 정적 사이트 생성(SSG) 방식을 채택하여 빠른 로딩 속도와 SEO 최적화를 달성했습니다.

### 주요 특징
- **프레임워크**: Astro 5.9.0 (Islands Architecture)
- **UI 라이브러리**: Svelte 5.33.0
- **스타일링**: Tailwind CSS 3.4.17
- **배포**: Netlify (Edge Functions 지원)
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
│   ├── edge-functions/        # Edge Functions (Deno 런타임)
│   └── functions/             # Serverless Functions (Node.js)
├── node_modules/              # 의존성 패키지
├── public/                    # 정적 자산
│   ├── favicon/               # 파비콘 세트
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

## 📦 Public 디렉토리 상세

### 정적 자산 관리 (`/public/`)

#### 1. 파비콘 시스템 (`/public/favicon/`)
- **다크/라이트 모드 대응**: 
  - `favicon-dark-*.png`: 다크모드용 파비콘
  - `favicon-light-*.png`: 라이트모드용 파비콘
- **다양한 크기 지원**: 32px, 128px, 180px, 192px
- **자동 테마 전환**: 시스템 테마에 따라 자동으로 적절한 파비콘 표시

#### 2. 이미지 자산 (`/public/images/`)
- **배너 이미지**:
  - `banner.png`: 데스크톱 배너
  - `mbanner.png`: 모바일 배너
- **포스트 이미지** (`/posts/`): 각 포스트의 Open Graph 이미지
- **업로드 디렉토리** (`/uploads/`): 사용자 업로드 이미지 저장소
- **프로필 이미지**: `tobilife.webp`

#### 3. 빌드 시 생성되는 파일들
- **`knowledge-base.json`**: 블로그 포스트 검색 인덱스
  - 모든 포스트의 제목, 내용, 태그 등을 인덱싱
  - 청크 단위로 분할하여 검색 성능 최적화
- **`posts-metadata.json`**: 포스트 메타데이터 캐시
  - 각 포스트의 제목, 설명, 카테고리, 태그 정보
  - 버전 해시로 캐시 무효화 관리
- **`site-config.json`**: 사이트 설정 정보
- **`assets-manifest.json`**: 정적 자산 매니페스트

#### 4. SEO 및 검증 파일
- **`robots.txt`**: 크롤러 규칙 정의
- **`google*.html`**: Google Search Console 검증
- **`naver*.html`**: 네이버 웹마스터 도구 검증

#### 5. 관리자 도구 (`/public/admin/`)
- **`config.yml`**: Decap CMS 설정
- **`index.html`**: CMS 관리자 인터페이스

#### 6. 성능 최적화 파일
- **`service-worker.js`**: 오프라인 지원 및 캐싱
- **`cache-admin.html`**: 캐시 관리 인터페이스
- **`_headers`**: Netlify 보안 헤더 설정
- **`_redirects`**: URL 리다이렉트 규칙

## 🛠️ Scripts 디렉토리 상세

### 빌드 스크립트 (`/scripts/`)

#### 1. 콘텐츠 빌드 스크립트

##### `build-knowledge-base.js`
**목적**: 블로그 포스트를 검색 가능한 인덱스로 변환
- **기능**:
  - 모든 마크다운 포스트 읽기
  - 프론트매터 파싱 및 메타데이터 추출
  - 마크다운을 순수 텍스트로 변환
  - 텍스트를 500단어 청크로 분할
  - 태그 및 카테고리 수집
- **출력**: `/public/knowledge-base.json`

##### `build-posts-metadata.js`
**목적**: 포스트 메타데이터를 효율적으로 관리
- **기능**:
  - 프론트매터 검증 (제목, 설명, 카테고리, 날짜)
  - 이미지 경로 검증
  - 버전 해시 생성 (SHA-256)
  - 통계 정보 생성 (카테고리별, 태그별 포스트 수)
- **출력**: `/public/posts-metadata.json`

##### `build-site-config.js`
**목적**: 사이트 설정을 JSON으로 변환
- **기능**: TypeScript 설정 파일을 런타임용 JSON으로 변환
- **출력**: `/public/site-config.json`

#### 2. 포스트 관리 스크립트

##### `new-post.js` / `create-post.js`
**목적**: 새 블로그 포스트 생성 자동화
- **기능**:
  - 대화형 포스트 생성 마법사
  - 프론트매터 템플릿 자동 생성
  - 파일명 및 슬러그 자동 설정
  - 카테고리 및 태그 선택 도우미

#### 3. 빌드 후처리 스크립트

##### `postbuild.js`
**목적**: 빌드 후 추가 최적화 작업
- **기능**:
  - 빌드 결과물 검증
  - 추가 파일 생성
  - 성능 최적화 적용

##### `generate-sw-manifest.js`
**목적**: Service Worker 매니페스트 생성
- **기능**:
  - 캐시할 리소스 목록 생성
  - 버전 관리
  - 오프라인 전략 설정

##### `generate-dynamic-sitemap.js`
**목적**: 동적 사이트맵 생성
- **기능**:
  - 모든 페이지 크롤링
  - 우선순위 자동 설정
  - 업데이트 빈도 설정

#### 4. 유틸리티 스크립트

##### `check-cache-status.js`
**목적**: 캐시 상태 모니터링
- **기능**:
  - Astra DB 캐시 통계 조회
  - 캐시 히트율 분석
  - 만료된 캐시 정리

## 🎨 Src 디렉토리 상세

### 1. Components 디렉토리 (`/src/components/`)

#### 코어 컴포넌트
- **`SEO.astro`**: 메타 태그 및 Open Graph 관리
- **`Navbar.astro`**: 상단 네비게이션 바
- **`Footer.astro`**: 하단 푸터
- **`GlobalStyles.astro`**: 전역 스타일 정의

#### 포스트 관련 컴포넌트
- **`PostCard.astro`**: 포스트 목록 카드
  - 반응형 이미지 처리
  - 읽기 시간 표시
  - 태그 및 카테고리 표시
- **`PostMeta.astro`**: 포스트 메타정보
  - 작성일/수정일 표시
  - 태그 및 카테고리 링크
  - 모바일 최적화 레이아웃
- **`PostPage.astro`**: 포스트 상세 페이지 레이아웃

#### 인터랙티브 컴포넌트 (Svelte)
- **`Search.svelte`**: 실시간 검색 기능
  - Pagefind 통합
  - 한국어 형태소 분석 지원
  - 키보드 네비게이션
- **`LightDarkSwitch.svelte`**: 다크모드 토글
  - 시스템 테마 연동
  - 로컬 스토리지 저장

#### Chat 서브시스템 (`/src/components/chat/`)
AI 기반 채팅 시스템의 핵심 컴포넌트들:

##### 핵심 서비스
- **`LangflowChatAstra.svelte`**: 메인 채팅 인터페이스
  - Astra DB 캐싱 통합
  - 스트리밍 응답 지원
  - 피드백 시스템
- **`OptimizedChatService.js`**: 최적화된 채팅 서비스
  - 응답 품질 평가
  - 자동 재시도 로직
  - 에러 핸들링

##### 지능형 처리 모듈
- **`IntentClassifier.js`**: 사용자 의도 분류
  - 날씨, 시간, 블로그 관련 질문 구분
  - 검색 필요성 판단
- **`ContextDetector.js`**: 문맥 인식
  - 대화 컨텍스트 추적
  - 다중 턴 대화 지원
- **`ChainOfThoughtService.js`**: 사고 연쇄 처리
  - 복잡한 질문 단계별 분해
  - 논리적 추론 과정 생성

##### 검색 및 RAG
- **`BlogRAGService.js`**: 블로그 전용 RAG
  - 로컬 포스트 검색
  - 관련 콘텐츠 추출
- **`WebSearchService.js`**: 웹 검색 통합
  - Google, Brave, Tavily API 관리
  - 검색 결과 최적화
- **`SearchPromptBuilder.js`**: 검색 쿼리 최적화
  - 자연어 → 검색 쿼리 변환
  - 언어별 최적화

##### 품질 관리
- **`ResponseQualityEvaluator.js`**: 응답 품질 평가
  - 완성도, 관련성, 구조 평가
  - 캐싱 기준 결정
- **`FeedbackService.js`**: 사용자 피드백 처리
  - 긍정/부정 피드백 수집
  - 품질 개선 데이터 수집

##### 언어 처리
- **`KoreanNLPService.js`**: 한국어 자연어 처리
  - 형태소 분석
  - 키워드 추출
  - 검색 쿼리 최적화

##### 유틸리티
- **`BlogListHelper.js`**: 블로그 목록 처리 도우미
  - 포스트 필터링
  - 정렬 및 페이지네이션

#### Control 컴포넌트 (`/src/components/control/`)
- **`BackToTop.astro`**: 맨 위로 스크롤 버튼
- **`ButtonLink.astro`**: 스타일된 링크 버튼
- **`ButtonTag.astro`**: 태그 버튼
- **`Pagination.astro`**: 페이지네이션 컨트롤

#### Misc 컴포넌트 (`/src/components/misc/`)
- **`Giscus.astro`**: GitHub 기반 댓글 시스템
- **`ImageWrapper.astro`**: 이미지 최적화 래퍼
- **`License.astro`**: 라이선스 표시
- **`Markdown.astro`**: 마크다운 렌더링

#### UI 컴포넌트 (`/src/components/ui/`)
- **`FeedbackButtons.svelte`**: 피드백 버튼 (좋아요/싫어요)
- **`FeedbackModal.svelte`**: 피드백 상세 입력 모달
- **`Toast.svelte`**: 알림 토스트 메시지

#### Widget 컴포넌트 (`/src/components/widget/`)
- **`Categories.astro`**: 카테고리 목록 위젯
- **`DisplaySettings.svelte`**: 디스플레이 설정 패널
- **`NavMenuPanel.astro`**: 모바일 네비게이션 메뉴
- **`Profile.astro`**: 프로필 위젯
- **`SideBar.astro`**: 사이드바 레이아웃
- **`Tags.astro`**: 태그 클라우드
- **`TOC.astro`**: 목차(Table of Contents)

### 2. Scripts 디렉토리 (`/src/scripts/`)

#### 성능 최적화 스크립트
- **`mobile-performance.js`**: 모바일 성능 최적화
  - 터치 이벤트 최적화
  - 불필요한 애니메이션 제거
- **`scrollbar-optimize.js`**: 스크롤바 최적화
  - OverlayScrollbars 통합
  - 부드러운 스크롤 구현

#### 페이지 전환 시스템 (`/src/scripts/optimized/`)
- **`swup-bundle-v2.js`**: Swup 번들 (최신 버전)
  - 선택적 프리로드
  - 캐시 관리
  - 애니메이션 최적화
- **`sw-manager.js`**: Service Worker 관리
  - 오프라인 지원
  - 리소스 캐싱
- **`swup-sw-integration.js`**: Swup-SW 통합
  - 페이지 전환 시 캐시 활용
  - 프리로드 최적화

### 3. Styles 디렉토리 (`/src/styles/`)

#### 메인 스타일
- **`main.css`**: 전역 스타일 정의
  - CSS 변수 정의
  - 기본 레이아웃
  - 반응형 브레이크포인트

#### 마크다운 스타일
- **`markdown.css`**: 마크다운 콘텐츠 스타일
- **`markdown-extend.styl`**: 확장 마크다운 스타일
  - 코드 블록 스타일
  - 테이블 스타일
  - 인용문 스타일

#### 최적화 스타일 (`/src/styles/optimizations/`)
- **`mobile-performance.css`**: 모바일 전용 최적화
  - 터치 타겟 크기 조정
  - 모바일 전용 레이아웃
- **`post-critical.css`**: 크리티컬 CSS
  - FOUC 방지
  - 초기 렌더링 최적화

#### 컴포넌트별 스타일
- **`post-card-optimize.css`**: PostCard 최적화
- **`scrollbar.css`**: 커스텀 스크롤바
- **`swup-optimize.css`**: 페이지 전환 애니메이션
- **`transition.css`**: 트랜지션 효과
- **`photoswipe.css`**: 이미지 갤러리

### 4. Pages 디렉토리 (`/src/pages/`)

Astro의 파일 기반 라우팅 시스템:

#### 정적 페이지
- **`index.astro`** (`[...page].astro`): 홈페이지 (페이지네이션 지원)
- **`about.astro`**: 소개 페이지
- **`404.astro`**: 404 에러 페이지
- **`500.astro`**: 500 에러 페이지
- **`offline.astro`**: 오프라인 페이지

#### 동적 라우트
- **`posts/[...slug].astro`**: 블로그 포스트 상세
  - 동적 슬러그 처리
  - 관련 포스트 추천
- **`archive/index.astro`**: 아카이브 메인
- **`archive/category/[category].astro`**: 카테고리별 포스트
- **`archive/tag/[tag].astro`**: 태그별 포스트

#### API 라우트
- **`robots.txt.ts`**: 동적 robots.txt 생성
- **`rss.xml.ts`**: RSS 피드 생성

### 5. 유틸리티 모듈 (`/src/utils/`)

- **`content-utils.ts`**: 콘텐츠 처리 유틸리티
  - 포스트 정렬
  - 필터링
  - 관련 포스트 찾기
- **`date-utils.ts`**: 날짜 처리
  - 포맷팅
  - 상대 시간 계산
- **`url-utils.ts`**: URL 처리
  - 슬러그 생성
  - 경로 정규화
- **`setting-utils.ts`**: 설정 관리
  - 로컬 스토리지 래퍼
  - 설정 마이그레이션

### 6. 플러그인 시스템 (`/src/plugins/`)

#### Remark 플러그인
- **`remark-reading-time.mjs`**: 읽기 시간 계산
- **`remark-excerpt.js`**: 요약 추출
- **`remark-directive-rehype.js`**: 커스텀 디렉티브 처리

#### Rehype 플러그인
- **`rehype-component-admonition.mjs`**: 경고문 컴포넌트
  - Note, Tip, Important, Caution, Warning 스타일
- **`rehype-component-github-card.mjs`**: GitHub 카드 임베드

### 7. 국제화 시스템 (`/src/i18n/`)

- **`i18nKey.ts`**: 번역 키 정의
- **`translation.ts`**: 번역 시스템 코어
- **`languages/`**: 언어별 번역 파일
  - 한국어(ko), 영어(en), 일본어(ja), 중국어(zh_CN), 태국어(th), 스페인어(es)

## 🚀 빌드 파이프라인

### 빌드 프로세스 (`pnpm build`)

```bash
# 1. 지식 베이스 구축
node scripts/build-knowledge-base.js

# 2. 포스트 메타데이터 생성
node scripts/build-posts-metadata.js

# 3. 사이트 설정 빌드
node scripts/build-site-config.js

# 4. Astro 빌드 (정적 사이트 생성)
astro build

# 5. 검색 인덱스 생성
pagefind --site dist

# 6. 포스트 빌드 처리
node scripts/postbuild.js

# 7. Service Worker 매니페스트 생성
node scripts/generate-sw-manifest.js
```

### 개발 환경

```bash
# 로컬 개발 서버
pnpm dev

# Netlify 환경 시뮬레이션
pnpm dev:netlify

# 클린 빌드
pnpm dev:clean
```

## 🎯 성능 최적화 전략

### 1. 이미지 최적화
- Sharp를 통한 자동 리사이징
- WebP 포맷 자동 변환
- 지연 로딩 구현
- 반응형 이미지 세트

### 2. 코드 분할
- Swup 관련 코드 별도 번들링
- 라우트별 코드 분할
- 동적 임포트 활용

### 3. 캐싱 전략
- Service Worker 오프라인 캐싱
- Netlify Edge 캐싱
- Astra DB 응답 캐싱

### 4. 모바일 최적화
- 터치 이벤트 최적화
- 불필요한 애니메이션 제거
- Critical CSS 인라인화
- 44px 최소 터치 타겟

## 🔧 개발 가이드라인

### Biome 코드 스타일
- **들여쓰기**: 탭 (너비 2)
- **따옴표**: 큰따옴표
- **세미콜론**: 필수
- **Import 정렬**: 자동

### 커밋 컨벤션
- `fix:` 버그 수정
- `feat:` 새 기능
- `docs:` 문서 업데이트
- `style:` 코드 스타일
- `refactor:` 리팩토링
- `perf:` 성능 개선
- `chore:` 기타 변경

### 디렉토리 규칙
- 컴포넌트: PascalCase
- 유틸리티: kebab-case
- 상수: UPPER_SNAKE_CASE

## 📊 모니터링 및 분석

### Core Web Vitals
- LCP: 2.5초 이하 목표
- CLS: 0.1 이하 유지
- INP: 200ms 이하 목표

### 분석 도구
- Lighthouse CI
- PageSpeed Insights
- Netlify Analytics

## 🐛 트러블슈팅

### 일반적인 문제
1. **모바일 CSS 미적용**: 미디어 쿼리에 `(hover: none) and (pointer: coarse)` 추가
2. **Swup 오류**: preloadPage 메서드 존재 확인
3. **이미지 FOUC**: Critical CSS에 이미지 스타일 포함

### 디버깅 도구
- Chrome DevTools
- Astro Dev Toolbar
- Biome 린터

---

이 문서는 프로젝트의 전체 구조와 각 부분의 역할을 설명합니다. 새로운 기능 추가나 버그 수정 시 이 문서를 참고하여 일관된 아키텍처를 유지하세요.
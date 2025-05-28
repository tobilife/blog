# 토비라이프 블로그 개발 진행사항

## 📅 2025-05-27

### ✅ 완료된 작업
1. **사이트 이름 변경**
   - src/config.ts의 title을 "Fuwari" → "토비라이프"로 변경
   - GitHub 링크 2곳을 tobilife/blog로 변경 (navBarConfig, profileConfig)

2. **프로필 이미지 변경**
   - 이미 src/config.ts의 avatar가 "assets/images/839135.webp"로 설정되어 있음
   - 이미지 파일 위치 확인 완료: src/assets/images/839135.webp

3. **GitHub OAuth 설정**
   - GitHub OAuth App 생성 ✅
   - Client ID: Ov23liK5mOXV8tlLfumz
   - Client Secret: 생성 완료

4. **Sanity CMS 제거 및 Decap CMS 설치**
   - Sanity 관련 패키지 제거 완료
   - Sanity 폴더 제거 시도 (수동으로 제거 필요)
   - Decap CMS 패키지 설치 완료
   - public/admin/index.html 생성 완료
   - public/admin/config.yml 생성 완료
   - Netlify Identity 위젯 추가 완료
   - 이미지 업로드 폴더 생성 완료 (public/images/uploads)

### 📝 설정 정보
- **Decap CMS 경로**: /admin/
- **인증 방식**: Netlify Identity
- **미디어 저장**: /images/uploads/
- **컨텐츠**: src/content/posts/
- **파일명 형식**: YYYY-MM-DD-slug.md

### 🔧 환경 정보
- **사이트 URL**: https://tobilife.netlify.app
- **호스팅**: Netlify
- GitHub OAuth App
  - Client ID: Ov23liK5mOXV8tlLfumz
  - Client Secret: 2859320759cc8ed88f534a9f319600c039a2d85a
  - Callback URL: https://tobilife.netlify.app/api/auth/callback/github

## 📅 2025-05-28

### ✅ INP (Interaction to Next Paint) 개선 작업 - Ultra 최적화 완료
1. **Search 컴포넌트 최적화 완료**
   - 검색 입력에 300ms debounce 추가
   - 모든 키 입력마다 검색이 실행되던 문제 해결
   - 실측 결과: 704ms → ~100ms (86% 개선)

2. **PostCard 제목 링크 최적화 완료**
   - transition 클래스를 특정 속성(color)에만 적용
   - will-change 속성 추가로 브라우저 렌더링 최적화
   - 불필요한 transition 제거
   - 전용 최적화 CSS 파일 추가 (post-card-optimize.css)

3. **Swup 페이지 전환 1차 최적화**
   - 전용 최적화 CSS 파일 추가 (swup-optimize.css)
   - contain 속성으로 레이아웃 계산 최소화
   - 스크롤 이벤트 핸들러 throttle 추가
   - passive 이벤트 리스너 옵션 추가

4. **Swup 페이지 전환 2차 최적화**
   - 페이지 전환 애니메이션 간소화 (200ms → 100ms)
   - translate 제거하고 opacity만 사용
   - 전용 JavaScript 최적화 파일 추가 (swup-performance.js)

5. **Swup 페이지 전환 Ultra 최적화 완료 ✅**
   - 전체 스크립트 재구성 (swup-ultra-optimize.js)
   - OverlayScrollbars 초기화 최적화 (scrollbar-optimize.js)
   - 모든 setTimeout 제거, requestAnimationFrame으로 대체
   - DOM 쿼리 캐싱
   - Intersection Observer로 스크롤바 지연 로딩
   - 페이지 전환 애니메이션 50ms로 단축
   - GPU 가속화 최적화

### 🎯 최종 성능 개선 결과
- **초기 측정**: PostCard 클릭 시 968ms INP
- **최적화 후 실측**: 304ms (68% 개선) ✅
- **대부분의 상호작용**: 16-128ms 범위로 매우 빠름
- **핵심 개선 사항**:
  - 무거운 스크롤바 초기화 분리
  - 페이지 전환 시 불필요한 DOM 조작 제거
  - 애니메이션 시간 단축 (50ms)
  - GPU 가속화 및 캐싱 최적화
  - Intersection Observer로 지연 로딩

### ✅ 최적화 완료 요약
- Search 컴포넌트: 704ms → ~100ms (86% 개선)
- PostCard 클릭: 968ms → 304ms (68% 개선)
- 전반적인 응답성 대폭 향상
- 레이아웃 변경 없이 순수 성능만 개선
- 레이아웃 변경 없이 순수 성능만 개선

### 🔧 버그 수정 (2025-05-28)
- **Navbar 사라지는 문제 해결**
  - swup-ultra-optimize.js에서 navbar 숨기기 로직 제거
  - page:view와 visit:end 훅에서 navbar 스타일 초기화 추가
  - navbar가 항상 표시되도록 보장
  - **마우스 커서 로딩 문제 해결**
  - swup-performance.js의 자동 실행 코드 비활성화
  - Layout.astro에서 import 문 제거
  - CSS로 커서 스타일 강제 초기화 추가
  - **링크 미리보기 기능 복구**
  - PostCard의 모든 링크에 data-swup-preload 속성 추가
  - Navbar 홈 링크에도 data-swup-preload 추가
  - Swup preload 기능이 정상 작동하도록 수정
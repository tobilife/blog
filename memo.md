
## 2025-06-01 - OG 이미지 경로 버그 수정

### 문제점
- 개별 포스트 페이지에서 OG 이미지 경로가 잘못 생성됨
- 예: `https://tobilife.netlify.app/posts/2025-05-27-.../assets/images/banner.png`
- 상대 경로가 현재 페이지 URL에 잘못 붙는 문제

### 원인 분석
- 포스트의 이미지가 상대 경로로 저장됨 (예: `"./cover.jpeg"`, `"assets/images/banner.png"`)
- Layout.astro에서 상대 경로를 절대 경로로 변환하는 로직 부재
- new URL() 생성 시 상대 경로가 현재 페이지 기준으로 해석됨

### 해결 방법
1. **Layout.astro 수정**
   - 상대 경로 감지 로직 추가
   - 상대 경로인 경우 config의 기본 OG 이미지 사용
   ```typescript
   if (banner && !banner.startsWith('/') && !banner.startsWith('http')) {
     banner = siteConfig.banner.src;
   }
   ```

### 결과
- 모든 페이지에서 OG 이미지가 올바른 절대 경로로 표시
- `/images/banner.png`로 통일된 경로 사용
- 소셜 미디어 공유 시 이미지 정상 표시

### 향후 개선사항
- 포스트별 커스텀 OG 이미지 지원
- 이미지 경로 처리 로직 개선
- 상대 경로를 절대 경로로 변환하는 유틸리티 함수 구현

### 추가 수정사항 (2차)
- url() 함수가 경로를 변환하는 문제 발견
- `/images/banner.png`가 `url()` 함수를 거치면 `/assets/images/banner.png`로 변환됨
- 카카오톡 등 일부 플랫폼에서 잘못된 경로로 인식
- OG 이미지 태그에서 url() 함수 제거로 해결
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

4. **Sanity CMS 기본 설정**
   - Sanity 프로젝트 생성 완료 (Project ID: 85dni07i)
   - Sanity 패키지 설치 완료
   - Astro와 Sanity 통합 설정 완료
   - Sanity Studio 파일 구조 생성 완료
   - 블로그 포스트 스키마 정의 완료

5. **Sanity 프로덕션 통합**
   - Sanity 데이터 페츭 유틸리티 생성 완료
   - 포스트 목록 페이지 생성 완료 (/posts/)
   - 개별 포스트 페이지 생성 완료 (/posts/[slug]/)
   - 네비게이션에 Posts 메뉴 추가 완료

### 🚀 다음 진행 예정
1. **프로덕션 배포 및 테스트**
   - GitHub에 커밋 및 푸시
   - Netlify에서 자동 배포
   - Sanity Studio에서 테스트 포스트 작성
   - 실제 사이트에서 포스트 확인

2. **기존 콘텐츠 마이그레이션**
   - 기존 Markdown 파일들을 Sanity로 마이그레이션
   - 자동화 스크립트 작성

### 📝 기타 커스터마이징 아이디어
- subtitle 변경
- 언어 설정을 'ko'로 변경
- 프로필 name, bio 설정
- 테마 색상 커스터마이징
- SNS 링크 업데이트

### 🔧 환경 정보
- GitHub OAuth App
  - Client ID: Ov23liK5mOXV8tlLfumz
  - Client Secret: 2859320759cc8ed88f534a9f319600c039a2d85a
- Sanity Project
  - Project ID: 85dni07i
  - Dataset: production

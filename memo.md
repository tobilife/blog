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

4. **Decap CMS 설치**
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

### 🔧 버그 수정 (2025-05-28)

### 🔧 화면 크기별 TOC 설정:
1280px-1400px (xl):
너비: 240px (w-60)
오른쪽 여백: 8px (right-2)
높이: calc(100vh - 12rem)
폰트 크기: 0.875rem
패딩 감소

1400px-1536px:
너비: 256px (w-64)
오른쪽 여백: 16px (right-4)
높이: calc(100vh - 16rem)
추가 여백: 2rem

1536px 이상 (2xl):
너비: 288px (w-72)
오른쪽 여백: 32px (right-8)
높이: calc(100vh - 20rem)

1920px 이상:
TOC가 메인 콘텐츠와 함께 중앙 정렬됨
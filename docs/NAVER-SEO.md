# 네이버 검색 엔진 최적화 가이드

## 네이버 웹마스터 도구 설정

### 1. 사이트 등록
1. [네이버 웹마스터 도구](https://searchadvisor.naver.com/) 접속
2. 사이트 추가: `https://tobilife.netlify.app`
3. 소유권 확인 (HTML 파일 또는 메타 태그 방식)

### 2. 사이트맵 제출
- URL: `https://tobilife.netlify.app/sitemap-index.xml`
- RSS 피드: `https://tobilife.netlify.app/rss.xml`

### 3. robots.txt 확인
네이버 봇 설정이 추가되었습니다:
- Yeti (네이버 검색 봇)
- NaverBot
- NaverBot-Scrap (네이버 공유 봇)

## 네이버 공유 디버거

### 사용 방법
1. [네이버 공유 디버거](https://share.naver.com/web/debugger) 접속
2. URL 입력: `https://tobilife.netlify.app/posts/[slug]/`
3. "확인" 버튼 클릭

### 메타 태그 체크리스트
- [ ] og:title
- [ ] og:description
- [ ] og:image
- [ ] og:url
- [ ] og:type

## 네이버 검색 최적화 팁

### 1. 콘텐츠 품질
- 원창성 있는 콘텐츠 작성
- 정기적인 업데이트
- 충분한 텍스트 분량 (500자 이상 권장)

### 2. 기술적 최적화
- 빠른 페이지 로딩 속도
- 모바일 최적화
- HTTPS 사용
- 구조화된 데이터 활용

### 3. 네이버 특화 최적화
- 네이버 블로그와 연동 고려
- 네이버 포스트 활용
- 지식iN 답변 참여

## 트러블슈팅

### 크롤링 문제
- Edge Function이 네이버 봇 감지 및 최적화된 응답 제공
- 5초 타임아웃 설정으로 빠른 응답 보장

### 공유 미리보기 문제
- 캐시 문제일 경우 디버거에서 재크롤링 요청
- 이미지는 절대 경로 사용 필수
- 이미지 크기: 1200x630px 권장

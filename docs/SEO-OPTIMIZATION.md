# SEO 및 크롤러 최적화 가이드

## 개요
이 문서는 TobiLife 블로그의 SEO 및 소셜 미디어 크롤러 최적화 설정을 설명합니다.

## 주요 기능

### 1. 포스트 메타데이터 시스템
- **파일**: `scripts/build-posts-metadata.js`
- **출력**: `public/posts-metadata.json`
- **기능**: 
  - 모든 포스트의 메타데이터를 JSON으로 생성
  - 빌드 시 자동 실행
  - 메타데이터 검증 및 통계 제공

### 2. Edge Functions

#### 소셜 미디어 크롤러 핸들러
- **파일**: `netlify/edge-functions/social-crawler-handler.js`
- **기능**:
  - 네이버, 카카오, Facebook, Twitter, LinkedIn 등 소셜 미디어 크롤러 감지
  - 502 오류 방지를 위한 타임아웃 처리 (네이버/카카오: 5초, 기타: 8초)
  - 실제 포스트 메타데이터 기반 Open Graph 태그 생성
  - 5분 캐싱으로 성능 최적화

#### Googlebot 핸들러
- **파일**: `netlify/edge-functions/googlebot-handler.js`
- **기능**:
  - Google, 네이버(Yeti), Bing, Yandex 등 검색 엔진 봇 감지
  - 구조화된 데이터(Schema.org) 생성
  - Breadcrumb 구조 데이터 포함
  - 상세한 로깅 및 성능 모니터링

#### 헬스 체크
- **파일**: `netlify/edge-functions/health-check.js`
- **엔드포인트**: `/health`
- **기능**: 시스템 상태 모니터링

## 사용 방법

### 1. 새 포스트 추가
```bash
# 새 포스트 생성
pnpm new-post

# 빌드 (메타데이터 자동 생성)
pnpm build
```

### 2. 메타데이터 검증
```bash
# 메타데이터만 생성하고 검증
node scripts/build-posts-metadata.js
```

### 3. 디버깅

#### Facebook 공유 디버거
1. https://developers.facebook.com/tools/debug/ 접속
2. URL 입력: `https://tobilife.netlify.app/posts/[slug]/`
3. "Scrape Again" 클릭

#### 카카오톡 공유 디버거
1. https://developers.kakao.com/tool/debugger/sharing 접속
2. URL 입력: `https://tobilife.netlify.app/posts/[slug]/`
3. "초기화" 버튼 클릭하여 캐시 갱신

#### 네이버 공유 디버거
1. https://share.naver.com/web/debugger 접속
2. URL 입력: `https://tobilife.netlify.app/posts/[slug]/`
3. "확인" 버튼 클릭

#### Google Search Console
1. URL 검사 도구 사용
2. 색인 생성 요청

#### 네이버 웹마스터 도구
1. https://searchadvisor.naver.com/ 접속
2. 사이트 등록 및 사이트맵 제출

## 메타데이터 형식

```yaml
---
title: 포스트 제목 (필수)
description: 포스트 설명 (필수)
published: 2024-01-01 (필수)
category: 카테고리명 (필수)
tags: 
  - 태그1
  - 태그2
image: /images/uploads/image.png (선택)
updated: 2024-01-02 (선택)
draft: false
---
```

## 성능 모니터링

### Edge Function 로그
- Netlify 대시보드 > Functions 탭에서 확인
- 응답 시간, 오류, 캐시 히트율 모니터링

### 헬스 체크
```bash
curl https://tobilife.netlify.app/health
```

## 트러블슈팅

### Facebook 502 오류
- Edge Function이 8초 타임아웃으로 폴백 HTML 반환
- 메타데이터 캐싱으로 성능 개선

### Google 색인 문제
- 실제 포스트 제목과 내용이 포함된 HTML 생성
- 구조화된 데이터로 검색 결과 개선

## 향후 개선 계획
1. 자동 sitemap 업데이트
2. AMP 페이지 지원
3. 이미지 최적화 자동화
4. 다국어 지원

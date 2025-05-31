# 지식베이스 시스템 구현 계획

## 개요
블로그의 마크다운 포스트를 자동으로 인덱싱하여 챗봇이 참조할 수 있는 정적 지식베이스 시스템

## 구현 단계

### 1. 빌드 타임 인덱싱 (완료)
- `scripts/build-knowledge-base.js` 생성
- 마크다운 파일을 읽어 JSON 형식으로 변환
- 텍스트 청킹으로 검색 효율성 향상

### 2. 검색 시스템 구현
- 클라이언트 사이드 검색 (Fuse.js 활용)
- 키워드 매칭 및 유사도 검색
- 태그/카테고리 필터링

### 3. 챗봇 통합
- 질문 분석 시 지식베이스 검색
- 관련 포스트 참조하여 답변 생성
- 출처 명시 기능

### 4. FAQ 시스템
- 자주 묻는 질문 자동 수집
- 정적 FAQ 페이지 생성
- 챗봇 우선 응답

## 기술 스택
- Node.js (빌드 스크립트)
- gray-matter (프론트매터 파싱)
- remark (마크다운 처리)
- Fuse.js (클라이언트 검색)

## 파일 구조
```
blog/
├── scripts/
│   └── build-knowledge-base.js    # 인덱싱 스크립트
├── public/
│   └── knowledge-base.json        # 생성된 지식베이스
├── src/
│   ├── content/posts/            # 원본 마크다운 포스트
│   └── components/
│       └── KnowledgeSearch.js    # 검색 컴포넌트
```

## 사용 방법
1. 빌드 시 자동 실행: `npm run build`
2. 수동 실행: `node scripts/build-knowledge-base.js`

## 장점
- 빌드 타임 처리로 런타임 부하 없음
- 정적 파일로 CDN 캐싱 가능
- 클라이언트 검색으로 서버 부하 감소
- 오프라인에서도 작동

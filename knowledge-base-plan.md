# 블로그 컨텍스트 기반 RAG 시스템 구현 계획

## 개요
사용자가 챗봇과 대화할 때, **블로그 관련 질문이나 맥락이 감지되면** 자동으로 블로그 포스트를 참조하여 답변하는 지능형 RAG 시스템

## 핵심 컨셉
- **컨텍스트 인식**: 대화 맥락이 블로그와 관련될 때만 작동
- **자동 참조**: 사용자가 명시적으로 요청하지 않아도 관련 포스트 자동 검색
- **스마트 응답**: 일반적인 질문과 블로그 관련 질문을 구분하여 처리

## 작동 시나리오

### 블로그 참조가 필요한 경우 (예시)
- "이 블로그에서 AI 관련 글 있어?"
- "토비라이프가 작성한 Docker 포스트 내용이 뭐야?"
- "여기서 본 Sim Studio 글 다시 설명해줘"
- "블로그 주인이 어떤 기술 스택 사용해?"

### 일반 질문 (블로그 참조 불필요)
- "Python으로 리스트 정렬하는 방법은?"
- "오늘 날씨 어때?"
- "React Hook이 뭐야?"

## 구현 단계

### 1. 컨텍스트 감지 시스템
- 사용자 질문 분석 로직 구현
- 블로그 관련 키워드/패턴 감지
  - "이 블로그", "여기서", "토비라이프", "포스트", "글"
  - 블로그에 있는 특정 주제 언급
- 컨텍스트 점수 계산 (0-1 범위)

### 2. 지식베이스 구축 (완료)
- 위치: `D:\dev\blog\src\content\posts`
- `scripts/build-knowledge-base.js`로 인덱싱
- 마크다운 포스트를 JSON으로 변환
- 검색 최적화를 위한 청킹

### 3. 조건부 RAG 통합
```javascript
// 의사 코드
if (isAboutBlog(userQuestion)) {
  // 1. 지식베이스에서 관련 포스트 검색
  const relevantPosts = searchKnowledgeBase(userQuestion);
  
  // 2. 검색된 내용을 LLM 프롬프트에 추가
  const contextualPrompt = buildPromptWithContext(userQuestion, relevantPosts);
  
  // 3. 컨텍스트 기반 답변 생성
  const answer = await llm.generate(contextualPrompt);
  
  // 4. 참조 링크와 함께 응답
  return formatAnswerWithReferences(answer, relevantPosts);
} else {
  // 일반적인 챗봇 응답
  return await llm.generate(userQuestion);
}
```

### 4. 챗봇 컴포넌트 수정
- 기존 `ChatInterface.tsx` 확장
- 컨텍스트 감지 로직 추가
- 조건부 지식베이스 검색
- 참조 표시 UI 추가

## 기술 구현 상세

### 컨텍스트 감지 알고리즘
1. **키워드 매칭**: 블로그 관련 단어 체크
2. **의도 분석**: 질문 유형 파악 (정보 요청, 요약, 설명 등)
3. **임계값 설정**: 0.3 이상이면 블로그 컨텍스트로 판단

### 검색 전략
- Fuse.js를 사용한 퍼지 검색
- 제목, 태그, 내용 가중치 차등 적용
- 최대 3개의 관련 포스트 반환

### 프롬프트 엔지니어링
```
시스템: 당신은 토비라이프 블로그의 AI 어시스턴트입니다.

[블로그 컨텍스트가 감지된 경우]
다음 블로그 포스트를 참고하여 답변하세요:
- 제목: {post.title}
- 내용: {relevantChunks}

사용자 질문: {userQuestion}

답변 시 참조한 포스트를 명시하고, 정확한 정보를 제공하세요.
```

## 예상 동작 흐름

1. 사용자: "이 블로그에서 Docker 관련 내용 있어?"
2. 시스템: 블로그 컨텍스트 감지 (점수: 0.9)
3. 지식베이스 검색: Docker, Ollama 관련 포스트 발견
4. LLM에 컨텍스트 제공하여 답변 생성
5. 응답: "네, 이 블로그에는 Docker 관련 포스트가 있습니다. 'Sim Studio' 포스트에서 Docker와 Ollama를 활용한 로컬 AI 환경 구축에 대해 다루고 있습니다. [포스트 링크]"

## 파일 구조
```
blog/
├── src/
│   ├── content/posts/          # 마크다운 포스트 위치
│   └── components/
│       └── chat/
│           ├── ChatInterface.tsx    # 챗봇 UI
│           ├── ContextDetector.ts   # 블로그 컨텍스트 감지
│           └── BlogRAGService.ts    # 조건부 RAG 로직
├── public/
│   └── knowledge-base.json     # 생성된 지식베이스
└── scripts/
    └── build-knowledge-base.js # 인덱싱 스크립트
```

## 장점
- 사용자가 명시적으로 요청하지 않아도 스마트하게 블로그 참조
- 일반 질문과 블로그 질문을 자동으로 구분
- 불필요한 검색 오버헤드 방지
- 자연스러운 대화 경험 제공

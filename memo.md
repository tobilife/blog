# Langflow Chat Widget 통합 (✅ 완료)

## 주요 URL
- Langflow Dashboard: https://astra.datastax.com/langflow
- Flow URL: https://astra.datastax.com/langflow/f6815d30-a3c1-4f0f-96a2-6abe11577877/flow/790574cb-2624-492b-a3a5-e0e118c1416f
- Blog: https://tobilife.netlify.app/

## ✅ 해결 완료
- CORS 문제 해결: Vite 프록시(로컬) + Netlify Functions(프로덕션)
- 커스텀 챗봇 UI로 완전한 제어 가능
- Langflow API를 직접 호출하여 실시간 대화 가능

## 구현 방식
1. **로컬 개발**: Vite 프록시를 통해 CORS 회피
2. **프로덕션**: Netlify Functions를 통해 서버리스 프록시 구현
3. **UI**: 커스텀 챗봇 인터페이스로 사용자 경험 최적화

### 1. Langflow Cloud 설정
- Astra DataStax 계정: happytobilife@gmail.com
- Flow ID: 790574cb-2624-492b-a3a5-e0e118c1416f
- Groq AI 모델 사용 (무료)

### 2. 파일 정리
- Railway 관련 파일 모두 삭제
- 사용하지 않는 채팅 컴포넌트 삭제
- 최종 컴포넌트: LangflowChatSimple.svelte

### 3. 블로그 통합
- MainGridLayout.astro에 채팅 위젯 추가
- 모든 페이지에서 챗봇 버튼 표시
- 파란색 원형 버튼 (우측 하단)
- 클릭 시 챗봇 창 열림

## 프로젝트 구조
```
/src/components/chat/
  └── LangflowChatSimple.svelte (최종 버전)
/netlify/functions/
  └── langflow-proxy.js (API 프록시)
```

## 배포 방법
1. `npx netlify-cli dev`로 로컬 테스트
2. `git add .`
3. `git commit -m "Fix Langflow chat widget"`
4. `git push`
5. Netlify 자동 배포

## 특징
- 서버 설치 불필요
- 무료 AI 모델 사용 (Groq)
- 실시간 대화 가능

## 로컬 개발 환경 설정
1. **Netlify CLI 설치**: `pnpm add -D netlify-cli`
2. **환경 변수 설정**: `.env` 파일에 LANGFLOW_API_TOKEN 추가
3. **실행 명령**: `pnpm dev:netlify` 사용 (X `pnpm dev`)

### 정리
- **로컬 개발**: `pnpm dev:netlify` (포트: 프록시 적용되어서 계속 바뀜. 콘솔로그 확인)
- **프로덕션**: GitHub에 push하면 Netlify에 자동 배포

## <think> 태그 제거 기능 추가 (✅ 완료)
- Langflow AI가 생성한 응답에서 <think>...</think> 태그를 자동 제거
- 정규표현식을 사용하여 안전하게 처리
- 사용자에게는 깨끗한 응답만 표시
- white-space: pre-wrap 스타일 추가로 줄바꿈 유지

## 마크다운 및 수식 렌더링 기능 추가 (✅ 완료)
- marked 라이브러리를 사용하여 마크다운 렌더링
- KaTeX를 사용하여 수학 수식 렌더링
  - 인라인 수식: $...$
  - 블록 수식: $$...$$
- 지원되는 기능:
  - 헤더 (H1~H6)
  - 리스트 (순서 있는/없는)
  - 코드 블록과 인라인 코드
  - 하이퍼링크
  - 굵은 글씨, 이탤릭체
  - 테이블
  - 인용문 (blockquote)
  - 구분선 (hr)
  - 수학 수식 (LaTeX 문법)

### 구현 방식
- Vite/Svelte 환경에 맞게 동적 import 사용
- onMount에서 marked와 katex 모듈을 비동기로 로드
- 모듈이 로드된 후에만 마크다운 렌더링 적용

### 주의사항
- marked가 package.json에 있더라도 `pnpm install`로 재설치 필요할 수 있음
- KaTeX CSS는 CDN으로 로드 (성능 최적화)

## 모바일 환경 개선 (✅ 완료)
- 챗봇 창이 화면 밖으로 벗어나는 문제 해결
- viewport meta 태그에 `viewport-fit=cover` 추가
- 모바일 CSS 개선:
  - `position: fixed`로 변경하여 화면에 고정
  - width/height를 100%로 설정 (100vw/100vh 대신)
  - safe area inset 추가 (iPhone notch 등 고려)
  - 헤더와 입력 영역에 safe area 패딩 적용

## UI 개선 (✅ 완료)
- 메시지 max-width를 80%에서 100%로 변경
- assistant 메시지가 채팅창 전체 너비를 활용하도록 개선
- 더 많은 컨텐츠를 한 줄에 표시할 수 있어 가독성 향상
- PC 환경에서 채팅창 크기 조정
  - width: calc(100vw - 40px)로 화면 너비에 맞춰 자동 계산
  - max-width: 800px로 최대 너비 제한
  - height: 600px에서 750px로 증가하여 더 많은 대화 내용 표시
- 자동 스크롤 기능 추가
  - 새로운 메시지가 추가될 때마다 자동으로 가장 아래로 스크롤
  - afterUpdate 라이프사이클 훅을 사용하여 메시지 업데이트 감지
  - chatMessagesEl 참조를 통해 스크롤 위치 제어
  - 사용자가 항상 최신 응답을 볼 수 있도록 개선
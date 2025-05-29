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
  └── LangflowChatSimple.svelte (최종 버전 - iframe 방식)
```

## 배포 방법
1. `pnpm dev`로 로컬 테스트
2. `git add .`
3. `git commit -m "Fix Langflow chat widget with iframe implementation"`
4. `git push`
5. Netlify 자동 배포

## 특징
- 서버 설치 불필요
- 무료 AI 모델 사용 (Groq)
- 실시간 대화 가능
- 모바일 반응형 디자인
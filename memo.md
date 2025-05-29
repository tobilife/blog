# Langflow Chat Widget 통합 (문제 해결 중)

## 현재 문제
- 채팅 위젯이 로컬 개발 환경에서 표시되지 않음
- Langflow 스크립트는 로드되지만 Chatbot 모듈이 window 객체에 노출되지 않음

## 시도한 해결 방법
1. client:only="svelte"를 client:load로 변경
2. 스크립트 로드 방식을 innerHTML에서 src 방식으로 변경
3. 모듈 로드 후 window.Chatbot 접근 시도

## ✅ 완료된 작업

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
- 모든 페이지에서 채팅 버튼 표시

## 프로젝트 구조
```
/src/components/chat/
  └── LangflowChatSimple.svelte (최종 버전)
```

## 배포 방법
1. `pnpm dev`로 로컬 테스트
2. `git add .`
3. `git commit -m "Add Langflow chat with Groq AI"`
4. `git push`
5. Netlify 자동 배포

## 특징
- 서버 설치 불필요
- 무료 AI 모델 사용
- 실시간 대화 가능
- 모바일 반응형 디자인

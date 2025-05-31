# 대화 맥락 유지 문제 해결 방안

## 현재 상황
- LAG 시스템은 정상 작동 중
- Langflow API가 stateless로 작동하여 대화 맥락을 기억하지 못함
- session_id를 보내고 있지만 효과가 없음

## 해결 방안

### 1. 클라이언트 측 대화 맥락 관리
```javascript
// 최근 N개의 대화 히스토리를 포함하여 전송
const conversationHistory = messages.slice(-5); // 최근 5개 대화
const contextualQuery = {
  current_query: userMessage,
  conversation_history: conversationHistory.map(m => ({
    role: m.role,
    content: m.content
  }))
};
```

### 2. 서버 측 프롬프트 개선
```javascript
function buildContextualPrompt(currentQuery, history) {
  let prompt = "이전 대화 맥락:\n";
  history.forEach(msg => {
    prompt += `${msg.role}: ${msg.content}\n`;
  });
  prompt += `\n현재 질문: ${currentQuery}\n`;
  prompt += "위의 대화 맥락을 참고하여 답변해주세요.";
  return prompt;
}
```

### 3. Langflow Flow 수정 필요
- Langflow에서 conversation_history를 처리할 수 있도록 Flow 수정
- 또는 단일 프롬프트로 맥락을 포함하여 전송

## 구현 우선순위
1. 서버에서 대화 히스토리를 프롬프트에 포함 (가장 간단)
2. 클라이언트에서 최근 대화 포함하여 전송
3. Langflow Flow 수정 (선택사항)

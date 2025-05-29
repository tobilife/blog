<script>
  import { onMount } from 'svelte';
  
  let messages = [];
  let inputMessage = '';
  let isLoading = false;
  let chatVisible = false;
  let sessionId = null;
  let LANGFLOW_API_URL = '';
  
  async function sendMessage() {
    if (!inputMessage.trim() || isLoading) return;
    
    const userMessage = inputMessage;
    inputMessage = '';
    
    // 사용자 메시지 추가
    messages = [...messages, { role: 'user', content: userMessage }];
    isLoading = true;
    
    try {
      console.log('Sending to:', LANGFLOW_API_URL);
      
      // Langflow API 호출
      const payload = {
        input_value: userMessage,
        output_type: "chat",
        input_type: "chat",
        stream: false,
        session_id: sessionId,
        tweaks: {}
      };
      
      console.log('Request payload:', payload);
      
      const response = await fetch(LANGFLOW_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const responseText = await response.text();
      console.log('Response status:', response.status);
      console.log('Response text:', responseText);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = JSON.parse(responseText);
      console.log('Parsed response:', data);
      
      // 응답 파싱 - 다양한 구조 시도
      let botResponse = 'Sorry, I could not generate a response.';
      
      // Langflow 응답 구조 확인
      if (data.outputs) {
        console.log('Found outputs:', data.outputs);
        
        // outputs 배열 순회
        if (Array.isArray(data.outputs)) {
          for (const output of data.outputs) {
            console.log('Checking output:', output);
            
            // 다양한 경로 시도
            if (output.outputs?.[0]?.results?.message?.text) {
              botResponse = output.outputs[0].results.message.text;
              break;
            }
            if (output.outputs?.[0]?.results?.text?.text) {
              botResponse = output.outputs[0].results.text.text;
              break;
            }
            if (output.outputs?.[0]?.results?.text) {
              botResponse = output.outputs[0].results.text;
              break;
            }
            if (output.outputs?.[0]?.message) {
              botResponse = output.outputs[0].message;
              break;
            }
            if (output.message) {
              botResponse = output.message;
              break;
            }
            if (output.text) {
              botResponse = output.text;
              break;
            }
          }
        }
      }
      
      // 직접 필드 확인
      if (data.result) {
        botResponse = data.result;
      } else if (data.message) {
        botResponse = data.message;
      } else if (data.text) {
        botResponse = data.text;
      }
      
      console.log('Final bot response:', botResponse);
      messages = [...messages, { role: 'assistant', content: botResponse }];
      
    } catch (error) {
      console.error('Error calling Langflow API:', error);
      
      let errorMessage = '죄송합니다. 일시적인 오류가 발생했습니다.';
      
      if (error.message.includes('401')) {
        errorMessage = '인증 오류가 발생했습니다. API 토큰을 확인해주세요.';
      } else if (error.message.includes('404')) {
        errorMessage = 'Flow를 찾을 수 없습니다. Flow ID를 확인해주세요.';
      } else if (error.message.includes('500')) {
        errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      } else if (error.message.includes('502') || error.message.includes('504') || error.message.includes('timeout')) {
        errorMessage = '응답 시간이 초과되었습니다. 더 간단한 질문으로 시도해주세요.';
      }
      
      messages = [...messages, { role: 'assistant', content: errorMessage }];
    } finally {
      isLoading = false;
    }
  }
  
  function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }
  
  onMount(() => {
    console.log('LangflowChatSimple: Initializing with Langflow API...');
    
    // 클라이언트 사이드에서만 실행
    sessionId = 'user_' + Date.now();
    
    // 프로덕션에서는 Netlify Functions 사용
    LANGFLOW_API_URL = '/.netlify/functions/langflow-proxy';
    
    console.log('API URL:', LANGFLOW_API_URL);
    
    // 초기 환영 메시지
    messages = [{
      role: 'assistant',
      content: '안녕하세요! 블로그에 대해 궁금한 점이 있으시면 물어봐주세요. 🤖'
    }];
    
    return () => {
      // Cleanup if needed
    };
  });
</script>

<div class="chat-container">
  <!-- 챗봇 버튼 -->
  <button 
    class="chat-button"
    class:active={chatVisible}
    on:click={() => chatVisible = !chatVisible}
  >
    {#if chatVisible}
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    {:else}
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="currentColor"/>
      </svg>
    {/if}
  </button>
  
  <!-- 챗봇 창 -->
  {#if chatVisible}
    <div class="chat-window">
      <!-- 헤더 -->
      <div class="chat-header">
        <span>Blog Assistant</span>
        <button on:click={() => chatVisible = false} class="close-button">×</button>
      </div>
      
      <!-- 메시지 영역 -->
      <div class="chat-messages">
        {#each messages as message}
          <div class="message {message.role}">
            {message.content}
          </div>
        {/each}
        
        {#if isLoading}
          <div class="message assistant">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        {/if}
      </div>
      
      <!-- 입력 영역 -->
      <div class="chat-input-container">
        <input
          type="text"
          class="chat-input"
          placeholder="메시지를 입력하세요..."
          bind:value={inputMessage}
          on:keypress={handleKeyPress}
          disabled={isLoading}
        />
        <button 
          class="send-button" 
          on:click={sendMessage}
          disabled={!inputMessage.trim() || isLoading}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 10L17 2L13 18L11 11L2 10Z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .chat-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
  }
  
  .chat-button {
    width: 56px;
    height: 56px;
    background-color: #4A90E2;
    color: white;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  }
  
  .chat-button:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  }
  
  .chat-button.active {
    background-color: #357ABD;
  }
  
  .chat-window {
    position: absolute;
    bottom: 70px;
    right: 0;
    width: 380px;
    height: 600px;
    background-color: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: slideUp 0.3s ease-out;
  }
  
  .chat-header {
    background-color: #4A90E2;
    color: white;
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
  }
  
  .close-button {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 24px;
    line-height: 1;
    padding: 0;
    width: 30px;
    height: 30px;
  }
  
  .close-button:hover {
    opacity: 0.8;
  }
  
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    background-color: #f7f9fc;
  }
  
  .message {
    margin-bottom: 12px;
    padding: 10px 14px;
    border-radius: 12px;
    max-width: 80%;
    word-wrap: break-word;
  }
  
  .message.user {
    background-color: #4A90E2;
    color: white;
    margin-left: auto;
    border-bottom-right-radius: 4px;
  }
  
  .message.assistant {
    background-color: white;
    color: #333;
    border: 1px solid #e0e0e0;
    border-bottom-left-radius: 4px;
  }
  
  .typing-indicator {
    display: flex;
    gap: 4px;
  }
  
  .typing-indicator span {
    width: 8px;
    height: 8px;
    background-color: #999;
    border-radius: 50%;
    animation: typing 1.4s infinite;
  }
  
  .typing-indicator span:nth-child(2) {
    animation-delay: 0.2s;
  }
  
  .typing-indicator span:nth-child(3) {
    animation-delay: 0.4s;
  }
  
  @keyframes typing {
    0%, 60%, 100% {
      opacity: 0.3;
    }
    30% {
      opacity: 1;
    }
  }
  
  .chat-input-container {
    display: flex;
    padding: 12px;
    background-color: white;
    border-top: 1px solid #e0e0e0;
  }
  
  .chat-input {
    flex: 1;
    padding: 10px 14px;
    border: 1px solid #e0e0e0;
    border-radius: 24px;
    outline: none;
    font-size: 14px;
    font-family: inherit;
  }
  
  .chat-input:focus {
    border-color: #4A90E2;
  }
  
  .send-button {
    margin-left: 8px;
    padding: 10px;
    background-color: #4A90E2;
    color: white;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s ease;
  }
  
  .send-button:hover:not(:disabled) {
    background-color: #357ABD;
  }
  
  .send-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  /* 모바일 반응형 */
  @media (max-width: 768px) {
    .chat-window {
      width: 100vw;
      height: 100vh;
      bottom: 0;
      right: 0;
      border-radius: 0;
      max-width: none;
    }
    
    .chat-button {
      bottom: 10px;
      right: 10px;
    }
  }
</style>

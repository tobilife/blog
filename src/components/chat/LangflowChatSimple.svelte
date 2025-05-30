<script>
  import { onMount, afterUpdate } from 'svelte';
  
  let messages = [];
  let inputMessage = '';
  let isLoading = false;
  let chatVisible = false;
  let sessionId = null;
  let LANGFLOW_API_URL = '';
  let marked = null;
  let katex = null;
  let chatMessagesEl = null; // chat-messages 엘리먼트 참조
  
  // 채팅 메시지 스크롤을 가장 아래로 이동
  function scrollToBottom() {
    if (chatMessagesEl) {
      chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    }
  }
  
  // 메시지가 업데이트될 때마다 스크롤
  afterUpdate(() => {
    scrollToBottom();
  });
  
  // 마크다운을 렌더링하는 함수
  function renderMarkdown(text) {
    if (!marked) return text;
    
    try {
      // 먼저 수식을 처리
      let processedText = text;
      if (katex) {
        // 인라인 수식: $...$
        processedText = processedText.replace(/\$([^\$]+)\$/g, (match, math) => {
          try {
            return katex.renderToString(math, { throwOnError: false });
          } catch (e) {
            return match;
          }
        });
        
        // 블록 수식: $$...$$
        processedText = processedText.replace(/\$\$([^\$]+)\$\$/g, (match, math) => {
          try {
            return katex.renderToString(math, { 
              throwOnError: false,
              displayMode: true 
            });
          } catch (e) {
            return match;
          }
        });
      }
      
      // 그 다음 마크다운 처리
      return marked.parse(processedText);
    } catch (error) {
      console.error('Markdown parsing error:', error);
      return text;
    }
  }
  
  // 타이핑 효과 함수
  async function typeMessage(text, messageIndex) {
    const typingSpeed = 15; // 각 문자 간 딜레이 (ms)
    const words = text.split(' ');
    let currentText = '';
    
    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i];
      messages[messageIndex] = {
        ...messages[messageIndex],
        content: currentText
      };
      messages = [...messages]; // 리액티비티 트리거
      
      // 단어 사이에 짧은 딜레이
      await new Promise(resolve => setTimeout(resolve, typingSpeed));
    }
  }
  
  async function sendMessage() {
    if (!inputMessage.trim() || isLoading) return;
    
    const userMessage = inputMessage;
    inputMessage = '';
    
    // 사용자 메시지 추가
    messages = [...messages, { role: 'user', content: userMessage }];
    isLoading = true;
    
    // 타임아웃을 위한 AbortController 생성
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25초 타임아웃
    
    try {
      //console.log('Sending to:', LANGFLOW_API_URL);
      
      // Langflow API 호출
      const payload = {
        input_value: userMessage,
        output_type: "chat",
        input_type: "chat",
        stream: false,
        session_id: sessionId,
        tweaks: {}
      };
      
      //console.log('Request payload:', payload);
      
      const response = await fetch(LANGFLOW_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      const responseText = await response.text();
      //console.log('Response status:', response.status);
      //console.log('Response text:', responseText);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = JSON.parse(responseText);
      //console.log('Parsed response:', data);
      
      // 응답 파싱 - 다양한 구조 시도
      let botResponse = 'Sorry, I could not generate a response.';
      
      // Langflow 응답 구조 확인
      if (data.outputs) {
        //console.log('Found outputs:', data.outputs);
        
        // outputs 배열 순회
        if (Array.isArray(data.outputs)) {
          for (const output of data.outputs) {
            //console.log('Checking output:', output);
            
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
      
      //console.log('Final bot response:', botResponse);
      
      // <think> 태그 제거
      if (botResponse.includes('<think>')) {
        // <think>...</think> 패턴을 찾아서 제거
        botResponse = botResponse.replace(/<think>.*?<\/think>/gs, '').trim();
      }
      
      // 타이핑 효과를 위해 빈 메시지 먼저 추가
      messages = [...messages, { role: 'assistant', content: '' }];
      
      // 타이핑 효과 구현
      await typeMessage(botResponse, messages.length - 1);
      
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error calling Langflow API:', error);
      
      let errorMessage = '죄송합니다. 일시적인 오류가 발생했습니다.';
      
      if (error.name === 'AbortError') {
        errorMessage = '응답 시간이 초과되었습니다. 더 간단한 질문으로 시도해주세요.';
      } else if (error.message.includes('401')) {
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
      clearTimeout(timeoutId);
      isLoading = false;
    }
  }
  
  function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }
  
  onMount(async () => {
    //console.log('LangflowChatSimple: Initializing with Langflow API...');
    
    // 동적으로 marked와 katex 로드
    try {
      const markedModule = await import('marked');
      marked = markedModule.marked;
      
      // Marked 설정
      marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false
      });
      
      const katexModule = await import('katex');
      katex = katexModule.default;
    } catch (error) {
      console.error('Failed to load markdown/katex modules:', error);
    }
    
    // 클라이언트 사이드에서만 실행
    sessionId = 'user_' + Date.now();
    
    // 프로덕션에서는 Netlify Functions 사용
    LANGFLOW_API_URL = '/.netlify/functions/langflow-proxy';
    
    //console.log('API URL:', LANGFLOW_API_URL);
    
    // 초기 환영 메시지
    messages = [{
      role: 'assistant',
      content: '안녕하세요!<br>토비라이프 블로그 채팅봇은<br>2024년12월까지의 데이터만 학습된 모델을 사용중입니다.<br>모델명 : qwen-qwq-32b<br>궁금한 점이 있으시면 물어봐주세요.🤖<br>따라서 2025년 이후의 내용이나<br>실시간 데이터에 대한 질문에는<br>도움을 드리기 어려울 수 있습니다.😊!'
    }];
    
    return () => {
      // Cleanup if needed
    };
  });
</script>

<svelte:head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css">
</svelte:head>

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
        <span>토비라이프 블로그 챗봇</span>
        <button on:click={() => chatVisible = false} class="close-button">×</button>
      </div>
      
      <!-- 메시지 영역 -->
      <div class="chat-messages" bind:this={chatMessagesEl}>
        {#each messages as message}
          <div class="message {message.role}">
            {#if message.role === 'assistant' && marked}
              {@html renderMarkdown(message.content)}
            {:else}
              {message.content}
            {/if}
          </div>
        {/each}
        
        {#if isLoading && messages[messages.length - 1]?.content === ''}
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
    width: calc(100vw - 40px); /* 화면 너비에서 여백을 뺀 값 */
    max-width: 800px; /* 최대 너비 제한 */
    height: 750px;
    background-color: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: slideUp 0.3s ease-out;
  }
  
  .chat-header {
    background-color: #b75dc1;
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
    scroll-behavior: smooth;
  }
  
  .message {
    margin-bottom: 12px;
    padding: 10px 14px;
    border-radius: 12px;
    max-width: 100%;
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
    line-height: 1.6;
  }
  
  /* 마크다운 스타일링 */
  .message.assistant :global(h1),
  .message.assistant :global(h2),
  .message.assistant :global(h3),
  .message.assistant :global(h4),
  .message.assistant :global(h5),
  .message.assistant :global(h6) {
    margin-top: 16px;
    margin-bottom: 8px;
    font-weight: 600;
    line-height: 1.4;
  }
  
  .message.assistant :global(h1) { font-size: 1.5em; }
  .message.assistant :global(h2) { font-size: 1.3em; }
  .message.assistant :global(h3) { font-size: 1.1em; }
  .message.assistant :global(h4) { font-size: 1em; }
  .message.assistant :global(h5) { font-size: 0.9em; }
  .message.assistant :global(h6) { font-size: 0.85em; }
  
  .message.assistant :global(p) {
    margin-bottom: 12px;
    line-height: 1.6;
  }
  
  .message.assistant :global(ul),
  .message.assistant :global(ol) {
    margin-bottom: 12px;
    padding-left: 24px;
  }
  
  .message.assistant :global(li) {
    margin-bottom: 4px;
    line-height: 1.6;
  }
  
  .message.assistant :global(code) {
    background-color: #f5f5f5;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
    color: #d73a49;
  }
  
  .message.assistant :global(pre) {
    background-color: #f6f8fa;
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 12px;
    overflow-x: auto;
  }
  
  .message.assistant :global(pre code) {
    background-color: transparent;
    padding: 0;
    color: #333;
  }
  
  .message.assistant :global(blockquote) {
    border-left: 4px solid #4A90E2;
    padding-left: 16px;
    margin-left: 0;
    margin-bottom: 12px;
    color: #666;
  }
  
  .message.assistant :global(a) {
    color: #4A90E2;
    text-decoration: none;
  }
  
  .message.assistant :global(a:hover) {
    text-decoration: underline;
  }
  
  .message.assistant :global(strong) {
    font-weight: 600;
  }
  
  .message.assistant :global(em) {
    font-style: italic;
  }
  
  .message.assistant :global(hr) {
    border: none;
    border-top: 1px solid #e0e0e0;
    margin: 16px 0;
  }
  
  .message.assistant :global(table) {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 12px;
  }
  
  .message.assistant :global(th),
  .message.assistant :global(td) {
    border: 1px solid #e0e0e0;
    padding: 8px 12px;
    text-align: left;
  }
  
  .message.assistant :global(th) {
    background-color: #f6f8fa;
    font-weight: 600;
  }
  
  /* KaTeX 스타일 */
  .message.assistant :global(.katex) {
    font-size: 1.1em;
  }
  
  .message.assistant :global(.katex-display) {
    margin: 16px 0;
    overflow-x: auto;
    overflow-y: hidden;
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
      position: fixed;
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
      bottom: 0;
      right: 0;
      left: 0;
      top: 0;
      border-radius: 0;
      animation: none;
    }
  }
</style>

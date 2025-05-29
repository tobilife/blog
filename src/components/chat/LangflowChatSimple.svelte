<script>
  import { onMount } from 'svelte';
  
  let chatVisible = false;
  
  onMount(() => {
    console.log('LangflowChatSimple: Creating chat widget...');
    
    // 챗봇 버튼 생성
    const chatButton = document.createElement('button');
    chatButton.id = 'langflow-chat-button';
    chatButton.className = 'langflow-chat-trigger';
    chatButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="currentColor"/>
      </svg>
    `;
    chatButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
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
      z-index: 9999;
      transition: all 0.3s ease;
    `;
    
    // 챗봇 창 생성
    const chatWindow = document.createElement('div');
    chatWindow.id = 'langflow-chat-window';
    chatWindow.style.cssText = `
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 380px;
      height: 600px;
      background-color: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      display: none;
      flex-direction: column;
      z-index: 9998;
      overflow: hidden;
    `;
    
    // 헤더
    const header = document.createElement('div');
    header.style.cssText = `
      background-color: #4A90E2;
      color: white;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
    `;
    header.innerHTML = `
      <span>Blog Assistant</span>
      <button id="close-chat" style="background: none; border: none; color: white; cursor: pointer; font-size: 24px;">×</button>
    `;
    
    // iframe
    const iframe = document.createElement('iframe');
    iframe.src = 'https://astra.datastax.com/langflow/flow/790574cb-2624-492b-a3a5-e0e118c1416f?chat=true';
    iframe.style.cssText = `
      width: 100%;
      flex: 1;
      border: none;
    `;
    iframe.allow = 'microphone; camera';
    
    chatWindow.appendChild(header);
    chatWindow.appendChild(iframe);
    
    // 이벤트 핸들러
    chatButton.onclick = () => {
      chatVisible = !chatVisible;
      chatWindow.style.display = chatVisible ? 'flex' : 'none';
      if (chatVisible) {
        chatButton.style.transform = 'scale(1.1)';
      } else {
        chatButton.style.transform = 'scale(1)';
      }
    };
    
    // 호버 효과
    chatButton.onmouseenter = () => {
      if (!chatVisible) chatButton.style.transform = 'scale(1.1)';
    };
    chatButton.onmouseleave = () => {
      if (!chatVisible) chatButton.style.transform = 'scale(1)';
    };
    
    // DOM에 추가
    document.body.appendChild(chatButton);
    document.body.appendChild(chatWindow);
    
    // 닫기 버튼 이벤트
    setTimeout(() => {
      const closeBtn = document.getElementById('close-chat');
      if (closeBtn) {
        closeBtn.onclick = () => {
          chatVisible = false;
          chatWindow.style.display = 'none';
          chatButton.style.transform = 'scale(1)';
        };
      }
    }, 100);
    
    console.log('LangflowChatSimple: Chat widget created successfully');
    
    return () => {
      // Cleanup
      const button = document.getElementById('langflow-chat-button');
      const window = document.getElementById('langflow-chat-window');
      if (button) button.remove();
      if (window) window.remove();
    };
  });
</script>

<style>
  /* 모바일 반응형 */
  @media (max-width: 768px) {
    :global(#langflow-chat-window) {
      width: 100% !important;
      height: 100% !important;
      bottom: 0 !important;
      right: 0 !important;
      left: 0 !important;
      top: 0 !important;
      border-radius: 0 !important;
      max-width: none !important;
    }
    
    :global(#langflow-chat-button) {
      bottom: 10px !important;
      right: 10px !important;
    }
  }
  
  /* 애니메이션 */
  :global(#langflow-chat-window) {
    animation: slideUp 0.3s ease-out;
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
</style>

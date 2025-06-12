<script>
  import { onMount } from 'svelte';
  
  let isExpanded = false;
  let isMinimized = false;
  
  function toggleExpanded() {
    if (isMinimized) {
      isMinimized = false;
    } else {
      isExpanded = !isExpanded;
    }
  }
  
  function minimize() {
    isMinimized = true;
    isExpanded = false;
  }
  
  function openInNewWindow() {
    const width = 800;
    const height = 750;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    window.open(
      'https://my-awesome-chatbot-three-theta.vercel.app',
      'TobiLifeChatbot',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  }
  
  onMount(() => {
    console.log('FloatingChatbot mounted');
  });
</script>

<div class="floating-container" class:expanded={isExpanded} class:minimized={isMinimized}>
  <!-- 최소화된 상태 (버튼만) -->
  {#if isMinimized}
    <button 
      class="chat-button"
      on:click={toggleExpanded}
      title="챗봇 열기"
    >
      <span class="notification-badge">AI</span>
      <i class="fas fa-robot"></i>
    </button>
  {:else}
    <!-- 챗봇 패널 -->
    <div class="chat-panel">
      <!-- 헤더 -->
      <div class="chat-header">
        <div class="header-left">
          <i class="fas fa-robot"></i>
          <span>토비라이프 AI 챗봇</span>
        </div>
        <div class="header-buttons">
          <button 
            class="header-btn"
            on:click={openInNewWindow}
            title="새 창에서 열기"
          >
            <i class="fas fa-external-link-alt"></i>
          </button>
          <button 
            class="header-btn"
            on:click={minimize}
            title="최소화"
          >
            <i class="fas fa-minus"></i>
          </button>
        </div>
      </div>
      
      <!-- 챗봇 콘텐츠 -->
      <div class="chat-content">
        <div class="welcome-message">
          <div class="bot-avatar">
            <i class="fas fa-robot"></i>
          </div>
          <h3>안녕하세요! 👋</h3>
          <p>토비라이프 AI 챗봇입니다.</p>
          <p class="sub-text">더 나은 대화 경험을 위해 새 창에서 챗봇을 이용해보세요!</p>
          
          <button class="primary-button" on:click={openInNewWindow}>
            <i class="fas fa-comments"></i>
            챗봇과 대화 시작하기
          </button>
          
          <div class="features">
            <div class="feature">
              <i class="fas fa-check-circle"></i>
              <span>실시간 AI 대화</span>
            </div>
            <div class="feature">
              <i class="fas fa-check-circle"></i>
              <span>블로그 콘텐츠 검색</span>
            </div>
            <div class="feature">
              <i class="fas fa-check-circle"></i>
              <span>맞춤형 추천</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<svelte:head>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</svelte:head>

<style>
  .floating-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  }
  
  .floating-container.expanded {
    width: 380px;
    height: 520px;
  }
  
  .floating-container.minimized {
    width: auto;
    height: auto;
  }
  
  /* 챗봇 버튼 (최소화 상태) */
  .chat-button {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    position: relative;
    overflow: hidden;
  }
  
  .chat-button:hover {
    transform: translateY(-3px) scale(1.05);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
  }
  
  .chat-button i {
    font-size: 26px;
    transition: all 0.3s ease;
  }
  
  .notification-badge {
    position: absolute;
    top: -5px;
    right: -5px;
    background: #ff4757;
    color: white;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: bold;
    animation: bounce 2s infinite;
    box-shadow: 0 2px 5px rgba(255, 71, 87, 0.5);
  }
  
  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-10px);
    }
    60% {
      transform: translateY(-5px);
    }
  }
  
  /* 챗봇 패널 */
  .chat-panel {
    width: 380px;
    height: 520px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    overflow: hidden;
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
  
  /* 헤더 */
  .chat-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
  }
  
  .header-left i {
    font-size: 20px;
  }
  
  .header-buttons {
    display: flex;
    gap: 8px;
  }
  
  .header-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }
  
  .header-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-1px);
  }
  
  /* 콘텐츠 영역 */
  .chat-content {
    flex: 1;
    padding: 24px;
    overflow-y: auto;
    background: #f8f9fa;
  }
  
  .welcome-message {
    text-align: center;
    animation: fadeIn 0.5s ease-out;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .bot-avatar {
    width: 80px;
    height: 80px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  }
  
  .bot-avatar i {
    font-size: 40px;
    color: white;
  }
  
  .welcome-message h3 {
    margin: 0 0 10px;
    font-size: 24px;
    color: #333;
  }
  
  .welcome-message p {
    margin: 0 0 8px;
    color: #666;
    font-size: 16px;
  }
  
  .sub-text {
    font-size: 14px;
    color: #999;
    margin-bottom: 24px;
  }
  
  .primary-button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 14px 28px;
    border-radius: 28px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  }
  
  .primary-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }
  
  .primary-button i {
    font-size: 18px;
  }
  
  .features {
    margin-top: 32px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    text-align: left;
  }
  
  .feature {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
  
  .feature i {
    color: #4ade80;
    font-size: 18px;
  }
  
  .feature span {
    color: #555;
    font-size: 14px;
  }
  
  /* 모바일 반응형 */
  @media (max-width: 640px) {
    .floating-container.expanded {
      width: calc(100vw - 40px);
      height: 480px;
      right: 20px;
      bottom: 20px;
    }
    
    .chat-panel {
      width: 100%;
      height: 100%;
    }
  }
</style>

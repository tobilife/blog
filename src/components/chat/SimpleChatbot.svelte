<script>
import { onMount } from "svelte";

let chatVisible = false;
let iframeLoaded = false;
let iframeElement;

function toggleChat() {
	chatVisible = !chatVisible;
}

function handleIframeLoad() {
	iframeLoaded = true;
	// Iframe 로드 완료
}

onMount(() => {
	// SimpleChatbot 마운트 완료
});
</script>

<div class="chat-container">
  <!-- 챗봇 버튼 -->
  <button 
    class="chat-button"
    class:active={chatVisible}
    on:click={toggleChat}
  >
    {#if !chatVisible}
      <span class="notification-badge">AI</span>
    {/if}
    
    {#if chatVisible}
      <i class="fas fa-times"></i>
    {:else}
      <i class="fas fa-robot"></i>
    {/if}
  </button>
  
  <!-- 챗봇 모달 -->
  <div class="chat-window" class:visible={chatVisible}>
    <!-- 헤더 -->
    <div class="chat-header">
      <span>토비라이프 AI 챗봇</span>
      <button on:click={toggleChat} class="close-button">×</button>
    </div>
    
    <!-- iframe 영역 -->
    <div class="iframe-container">
      {#if !iframeLoaded}
        <div class="loading">
          <div class="spinner"></div>
          <p>챗봇을 불러오는 중...</p>
        </div>
      {/if}
      <iframe
        bind:this={iframeElement}
        src="https://my-awesome-chatbot-three-theta.vercel.app"
        title="토비라이프 챗봇"
        style="border: none; opacity: {iframeLoaded ? 1 : 0};"
        on:load={handleIframeLoad}
        allow="microphone; camera"
      />
    </div>
  </div>
</div>

<svelte:head>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</svelte:head>

<style>
  .chat-container {
    position: fixed;
    bottom: 20px;
    right: 10px;
    z-index: 9999;
  }
  
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
  
  .chat-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    transform: scale(0);
    transition: transform 0.4s ease;
  }
  
  .chat-button:hover {
    transform: translateY(-3px) scale(1.05);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
  }
  
  .chat-button:hover::before {
    transform: scale(1);
  }
  
  .chat-button:active {
    transform: translateY(-1px) scale(1.02);
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  }
  
  .chat-button.active {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0% {
      box-shadow: 0 4px 15px rgba(240, 147, 251, 0.4);
    }
    50% {
      box-shadow: 0 4px 30px rgba(240, 147, 251, 0.6);
    }
    100% {
      box-shadow: 0 4px 15px rgba(240, 147, 251, 0.4);
    }
  }
  
  .chat-button i {
    font-size: 26px;
    transition: all 0.3s ease;
  }
  
  .chat-button:hover i {
    transform: scale(1.2) rotate(360deg);
  }
  
  .chat-button.active i {
    animation: wiggle 0.5s ease;
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
  
  @keyframes wiggle {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-10deg); }
    75% { transform: rotate(10deg); }
  }
  
  .chat-window {
    position: absolute;
    bottom: 70px;
    right: 0;
    width: calc(100vw - 40px);
    max-width: 800px;
    height: 750px;
    background-color: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    /* 기본적으로 숨김 */
    opacity: 0;
    visibility: hidden;
    transform: translateY(20px);
    transition: all 0.3s ease-out;
  }
  
  .chat-window.visible {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }
  
  .chat-header {
    background-color: #2575d3;
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
    transition: opacity 0.2s ease;
  }
  
  .close-button:hover {
    opacity: 0.8;
  }
  
  .iframe-container {
    flex: 1;
    position: relative;
    overflow: hidden;
  }
  
  iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: none;
    transition: opacity 0.3s ease;
  }
  
  /* 로딩 스피너 스타일 */
  .loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    z-index: 10;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    margin: 0 auto 20px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #2575d3;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  .loading p {
    color: #666;
    font-size: 14px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
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
    }
    
    .chat-window.visible {
      animation: none;
    }
    
    .chat-header {
      border-radius: 0;
    }
  }
</style>

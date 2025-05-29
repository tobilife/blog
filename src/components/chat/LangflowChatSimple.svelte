<script>
  import { onMount } from 'svelte';
  
  let chatInitialized = false;
  
  onMount(async () => {
    try {
      // Langflow Embedded Chat Script 동적 로드
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://cdn.jsdelivr.net/gh/langflow-ai/langflow-embedded-chat@v1.0.6/dist/build/static/js/index.js';
      
      // 스크립트 로드 완료 대기
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      
      // 모듈이 로드될 때까지 잠시 대기
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // window 객체에서 Chatbot 접근
      const initScript = document.createElement('script');
      initScript.innerHTML = `
        (function() {
          if (typeof window.Chatbot !== 'undefined') {
            window.Chatbot.initFull({
              host: "https://astra.datastax.com/langflow",
              flow: "790574cb-2624-492b-a3a5-e0e118c1416f",
              
              // UI 설정
              windowTitle: "Blog Assistant",
              welcomeMessage: "안녕하세요! 블로그에 대해 궁금한 점이 있으시면 물어봐주세요. 🤖",
              errorMessage: "죄송합니다. 일시적인 오류가 발생했습니다.",
              placeholder: "메시지를 입력하세요...",
              
              // 스타일 설정
              chatTriggerStyle: {
                position: "fixed",
                bottom: "20px",
                right: "20px",
                backgroundColor: "#4A90E2",
                color: "white",
                borderRadius: "50%",
                width: "56px",
                height: "56px",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000
              },
              
              chatWindowStyle: {
                position: "fixed",
                bottom: "80px",
                right: "20px",
                width: "380px",
                height: "500px",
                backgroundColor: "white",
                borderRadius: "12px",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
                display: "flex",
                flexDirection: "column",
                zIndex: 1000
              },
              
              // 기타 옵션
              online: true,
              chatPosition: "bottom-right",
              
              // 반응형 설정
              responsive: true
            });
            
            console.log('Langflow chat widget initialized successfully');
          } else {
            console.error('Chatbot module not found on window object');
          }
        })();
      `;
      
      document.body.appendChild(initScript);
      chatInitialized = true;
      
    } catch (error) {
      console.error('Failed to load Langflow chat widget:', error);
    }
    
    return () => {
      // Cleanup
      if (chatInitialized) {
        const chatElements = document.querySelectorAll('.langflow-chat-widget');
        chatElements.forEach(el => el.remove());
      }
    };
  });
</script>

<style>
  /* Langflow Chat Widget 커스텀 스타일 */
  :global(.langflow-chat-widget) {
    z-index: 1000 !important;
  }
  
  :global(.langflow-chat-trigger) {
    transition: transform 0.2s ease;
  }
  
  :global(.langflow-chat-trigger:hover) {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2) !important;
  }
  
  /* 모바일 반응형 */
  @media (max-width: 768px) {
    :global(.langflow-chat-window) {
      width: 90vw !important;
      max-width: 380px !important;
      height: 70vh !important;
      max-height: 500px !important;
      right: 50% !important;
      transform: translateX(50%) !important;
      bottom: 20px !important;
    }
  }
</style>

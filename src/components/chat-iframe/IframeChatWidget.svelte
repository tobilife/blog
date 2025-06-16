<script>
import { onDestroy, onMount } from "svelte";

let chatVisible = false;
let iframeRef;
let isMobile = false;
let windowHeight = 0;
let windowWidth = 0;
let isIframeLoading = true;
let iframeError = false;

// 모바일 감지 함수
function checkMobile() {
	if (typeof window !== "undefined") {
		isMobile = window.innerWidth <= 768;
		windowHeight = window.innerHeight;
		windowWidth = window.innerWidth;
	}
}

// iframe과의 통신을 위한 postMessage 리스너
function handleMessage(event) {
	// 보안: origin 확인
	if (event.origin !== "https://my-awesome-chatbot-three-theta.vercel.app") {
		return;
	}

	// 메시지 타입에 따른 처리
	if (event.data && event.data.type === "close-chat") {
		chatVisible = false;
	}
}

// 챗봇 토글 함수
function toggleChat() {
	chatVisible = !chatVisible;
	isIframeLoading = true;
	iframeError = false;

	// iframe이 로드된 후 상태 전송
	if (chatVisible && iframeRef) {
		setTimeout(() => {
			iframeRef.contentWindow.postMessage(
				{
					type: "chat-opened",
					isMobile: isMobile,
				},
				"https://my-awesome-chatbot-three-theta.vercel.app",
			);
		}, 100);
	}
}

// 닫기 버튼 클릭 핸들러
function closeChat() {
	// iframe에 닫기 이벤트 전송
	if (iframeRef) {
		iframeRef.contentWindow.postMessage({ type: "chat-closing" }, "https://my-awesome-chatbot-three-theta.vercel.app");
	}
	chatVisible = false;
}

onMount(() => {
	// 초기 모바일 체크
	checkMobile();

	// 윈도우 리사이즈 이벤트 리스너
	window.addEventListener("resize", checkMobile);

	// postMessage 리스너 등록
	window.addEventListener("message", handleMessage);

	// ESC 키로 닫기
	const handleKeydown = (e) => {
		if (e.key === "Escape" && chatVisible) {
			closeChat();
		}
	};
	window.addEventListener("keydown", handleKeydown);

	return () => {
		window.removeEventListener("resize", checkMobile);
		window.removeEventListener("message", handleMessage);
		window.removeEventListener("keydown", handleKeydown);
	};
});

onDestroy(() => {
	// 클린업
	if (typeof window !== "undefined") {
		window.removeEventListener("resize", checkMobile);
		window.removeEventListener("message", handleMessage);
	}
});
</script>

<div class="chat-container">
	<!-- 챗봇 버튼 -->
	<button 
		class="chat-button"
		class:active={chatVisible}
		on:click={toggleChat}
		aria-label="AI 챗봇 열기"
	>
		{#if !chatVisible}
			<span class="notification-badge">AI</span>
		{/if}
		
		{#if chatVisible}
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		{:else}
			<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20Z" fill="currentColor"/>
				<path d="M12 6C12.55 6 13 6.45 13 7V11.25L16.5 13.5C16.89 13.76 17 14.26 16.74 14.65C16.48 15.04 15.98 15.15 15.59 14.89L11.59 12.39C11.41 12.27 11.3 12.08 11.3 11.88V7C11.3 6.45 11.75 6 12 6Z" fill="currentColor"/>
				<circle cx="12" cy="12" r="1.5" fill="currentColor"/>
				<path d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
			</svg>
		{/if}
	</button>
	
	<!-- 챗봇 iframe 창 -->
	{#if chatVisible}
		<div 
			class="chat-window"
			class:mobile={isMobile}
			style={isMobile ? `height: ${windowHeight}px; width: ${windowWidth}px;` : ""}
		>
			<!-- 모바일에서만 보이는 닫기 버튼 -->
			{#if isMobile}
				<button 
					class="mobile-close-button"
					on:click={closeChat}
					aria-label="챗봇 닫기"
				>
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</button>
			{/if}
			
			<!-- iframe -->
			{#if isIframeLoading}
			 <div class="loading-container">
			  <div class="loading-spinner"></div>
			  <p class="loading-text">챗봇을 불러오는 중...</p>
			 </div>
			{/if}
			
			{#if iframeError}
			 <div class="error-container">
			  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			   <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			  </svg>
			  <p class="error-text">챗봇을 불러올 수 없습니다.</p>
			  <button class="retry-button" on:click={() => { iframeError = false; isIframeLoading = true; }}>
			   다시 시도
			  </button>
			 </div>
			{/if}
			
			<iframe
			 bind:this={iframeRef}
			 src="https://my-awesome-chatbot-three-theta.vercel.app/embed"
			 title="토비라이프 AI 챗봇"
			 class="chat-iframe"
			 class:mobile={isMobile}
			 class:loading={isIframeLoading}
			 allow="clipboard-write; accelerometer; camera; geolocation; gyroscope; microphone; payment"
			 sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-popups-to-escape-sandbox allow-top-navigation"
			 on:load={() => { isIframeLoading = false; }}
			 on:error={() => { isIframeLoading = false; iframeError = true; }}
			/>
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
	
	/* 챗봇 버튼 스타일 */
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
	
	/* 챗봇 창 스타일 */
	.chat-window {
		position: absolute;
		bottom: 70px;
		right: 0;
		width: min(calc(100vw - 40px), 450px);
		height: min(calc(100vh - 150px), 650px);
		background-color: white;
		border-radius: 16px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
		overflow: hidden;
		animation: slideUp 0.3s ease-out;
		transition: all 0.3s ease;
	}
	
	/* 모바일 전체화면 스타일 */
	.chat-window.mobile {
		position: fixed;
		bottom: 0;
		right: 0;
		left: 0;
		top: 0;
		width: 100% !important;
		height: 100% !important;
		max-width: none;
		max-height: none;
		border-radius: 0;
		animation: slideInMobile 0.3s ease-out;
	}
	
	/* 모바일 닫기 버튼 */
	.mobile-close-button {
		position: absolute;
		top: 20px;
		right: 20px;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		z-index: 10001;
		transition: all 0.2s ease;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
	}
	
	.mobile-close-button:hover {
		background: rgba(0, 0, 0, 0.9);
		transform: scale(1.1);
	}
	
	.mobile-close-button:active {
		transform: scale(0.95);
	}
	
	/* iframe 스타일 */
	.chat-iframe {
		width: 100%;
		height: 100%;
		border: none;
		background: white;
	}
	
	.chat-iframe.mobile {
		/* 모바일에서는 안전 영역 고려 */
		height: 100%;
		padding-top: env(safe-area-inset-top);
		padding-bottom: env(safe-area-inset-bottom);
	}
	
	/* 애니메이션 */
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
	
	@keyframes slideInMobile {
		from {
			opacity: 0;
			transform: translateX(100%);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}
	
	/* 태블릿 대응 */
	@media (min-width: 769px) and (max-width: 1024px) {
		.chat-window {
			width: 400px;
			height: 600px;
		}
	}
	
	/* 대형 데스크톱 */
	@media (min-width: 1440px) {
		.chat-window {
			width: 450px;
			height: 700px;
		}
	}
	
	/* iOS 노치 대응 */
	@supports (padding: max(0px)) {
		.mobile-close-button {
			top: max(20px, env(safe-area-inset-top) + 10px);
			right: max(20px, env(safe-area-inset-right) + 10px);
		}
	}
</style>

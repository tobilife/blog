<script>
import { onDestroy, onMount } from "svelte";

let chatVisible = false;
let iframeRef;
let isMobile = false;
let windowHeight = 0;
let windowWidth = 0;
let isIframeLoading = true;
let iframeError = false;
let previousScrollY = 0;
let hasLoadedOnce = false; // iframe이 한번이라도 로드되었는지 추적
let showLoadingMinTime = false; // 3초 로딩 표시 여부

// 테스트용 플래그 - false로 설정하면 iframe이 로드되지 않음
const checkFlag = false;

// 모바일 감지 함수
function checkMobile() {
	if (typeof window !== "undefined") {
		isMobile = window.innerWidth <= 768;
		windowHeight = window.innerHeight;
		windowWidth = window.innerWidth;
	}
}

// 스크롤 잠금/해제 함수
function lockBodyScroll() {
	if (typeof document !== "undefined" && isMobile) {
		// 현재 스크롤 위치 저장
		previousScrollY = window.scrollY;

		// body 스타일 설정
		document.body.style.position = "fixed";
		document.body.style.top = `-${previousScrollY}px`;
		document.body.style.width = "100%";
		document.body.style.overflow = "hidden";

		// iOS 바운스 스크롤 방지
		document.documentElement.style.overflow = "hidden";
	}
}

function unlockBodyScroll() {
	if (typeof document !== "undefined" && isMobile) {
		// body 스타일 복원
		document.body.style.position = "";
		document.body.style.top = "";
		document.body.style.width = "";
		document.body.style.overflow = "";

		// html overflow 복원
		document.documentElement.style.overflow = "";

		// 이전 스크롤 위치로 복원
		window.scrollTo(0, previousScrollY);
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
		unlockBodyScroll();
	}
}

function toggleChat() {
	chatVisible = !chatVisible;
	if (chatVisible) {
		// 챗봇을 열 때
		if (hasLoadedOnce) {
			// 이미 한번 로드된 경우 즉시 iframe 표시
			isIframeLoading = false;
		} else {
			// 최초 로딩시 3초 동안 로딩 인디케이터 표시
			isIframeLoading = true;
			showLoadingMinTime = true;

			// 5초 후 로딩 인디케이터 숨기기
			setTimeout(() => {
				showLoadingMinTime = false;
				if (checkFlag) {
					isIframeLoading = false;
				}
			}, 5000);
		}

		iframeError = false;
		lockBodyScroll();

		if (iframeRef) {
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
	} else {
		unlockBodyScroll();
	}
}

// 닫기 버튼 클릭 핸들러
function closeChat() {
	// iframe에 닫기 이벤트 전송
	if (iframeRef) {
		iframeRef.contentWindow.postMessage({ type: "chat-closing" }, "https://my-awesome-chatbot-three-theta.vercel.app");
	}
	chatVisible = false;
	unlockBodyScroll();
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
		// 컴포넌트가 언마운트될 때 스크롤 잠금 해제
		unlockBodyScroll();
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
	  <!-- 챗봇 아이콘 이미지 -->
	  <img 
	   src="/images/chat-bot-icon.webp" 
	   alt="AI 챗봇" 
	   class="chat-icon"
	  />
	 {/if}
	 
	 {#if chatVisible}
	  <!-- 닫기 아이콘 -->
	  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
	   <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
	  </svg>
	 {/if}
	 </button>
	 <!-- 챗봇 텍스트 배지 -->
	 {#if !chatVisible}
	  <div class="chat-badge">토비라이프 AI</div>
	 {/if}
	 
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
			 <!-- ====================================================== -->
			 <!-- START: 새로운 우주 테마 로딩 인디케이터 -->
			 <!-- ====================================================== -->
			 <div class="loading-container-space">
			  <!-- 별 배경 (3개 레이어로 시차 효과) -->
			  <div class="stars"></div>
			  <div class="stars2"></div>
			  <div class="stars3"></div>
			
			  <div class="loading-wrapper-space">
			   <!-- 달 -->
			   <div class="moon">
			    <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
			     <path d="M50 0 C22.3858 0 0 22.3858 0 50 C0 77.6142 22.3858 100 50 100 C77.6142 100 100 77.6142 100 50 C100 22.3858 77.6142 0 50 0 Z M50 10 C72.0914 10 90 27.9086 90 50 C90 72.0914 72.0914 90 50 90 C35.938 90 23.733 81.3323 17.5 70 C25.525 70.143 45 65 55 45 C65 25 60 15 60 15 C57.0699 11.9614 53.6677 10 50 10 Z" fill="#F7F3E3"/>
			    </svg>
			   </div>
			   
			   <!-- 달려가는 캐릭터와 경로 -->
			   <div class="rocket-container">
			    <!-- 귀여운 우주선과 토비 캐릭터 -->
			    <div class="rocket-tobi">
			     <!-- 우주선 본체 -->
			     <svg id="rocket" width="150" height="150" viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg">
			      <!-- 우주선 몸통 -->
			      <ellipse cx="75" cy="75" rx="45" ry="55" fill="#FF6B6B"/>
			      <ellipse cx="75" cy="75" rx="40" ry="50" fill="#FF8C8C"/>
			      
			      <!-- 우주선 창문 -->
			      <circle cx="75" cy="65" r="25" fill="#4ECDC4" opacity="0.8"/>
			      <circle cx="75" cy="65" r="22" fill="#6FFFE9" opacity="0.6"/>
			      <ellipse cx="70" cy="60" rx="12" ry="15" fill="rgba(255,255,255,0.4)"/>
			      
			      <!-- 토비 캐릭터 (창문 안에) -->
			      <g id="tobi-character">
			       <!-- 머리 -->
			       <circle cx="75" cy="60" r="15" fill="#FFE5B4"/>
			       <!-- 눈 -->
			       <circle cx="70" cy="58" r="2" fill="#333"/>
			       <circle cx="80" cy="58" r="2" fill="#333"/>
			       <circle cx="71" cy="57" r="1" fill="#FFF"/>
			       <circle cx="81" cy="57" r="1" fill="#FFF"/>
			       <!-- 볼 -->
			       <circle cx="65" cy="63" r="3" fill="#FFB3BA" opacity="0.7"/>
			       <circle cx="85" cy="63" r="3" fill="#FFB3BA" opacity="0.7"/>
			       <!-- 미소 -->
			       <path d="M70 65 Q 75 68, 80 65" stroke="#333" stroke-width="1.5" stroke-linecap="round" fill="none"/>
			       <!-- 헬멧 -->
			       <path d="M60 55 Q 75 45, 90 55" stroke="none" fill="#FFD93D" opacity="0.3"/>
			      </g>
			      
			      <!-- 우주선 날개 -->
			      <ellipse cx="30" cy="85" rx="20" ry="35" fill="#FF6B6B" transform="rotate(-30 30 85)"/>
			      <ellipse cx="120" cy="85" rx="20" ry="35" fill="#FF6B6B" transform="rotate(30 120 85)"/>
			      
			      <!-- 우주선 하단 -->
			      <ellipse cx="75" cy="120" rx="25" ry="15" fill="#FFD93D"/>
			      <ellipse cx="75" cy="125" rx="20" ry="10" fill="#FFED4B"/>
			      
			      <!-- 불꽃 효과 -->
			      <g id="flames">
			       <ellipse cx="75" cy="135" rx="15" ry="25" fill="#FFD93D" opacity="0.8"/>
			       <ellipse cx="75" cy="140" rx="10" ry="20" fill="#FF6B6B" opacity="0.6"/>
			       <ellipse cx="75" cy="145" rx="5" ry="15" fill="#FFF" opacity="0.4"/>
			      </g>
			      
			      <!-- TOBI 가방/표시 -->
			      <rect x="85" y="70" width="25" height="18" rx="6" fill="#764ba2"/>
			      <text x="97" y="82" font-family="Arial Black" font-size="8" font-weight="bold" text-anchor="middle" fill="#FFF">TOBI</text>
			     </svg>
			    </div>
			   </div>
			   
			   <!-- 로딩 텍스트 -->
			   <div class="loading-text-container-space">
			    <h3 class="loading-title-space">우주선을 타고 달로 향하고 있어요 🚀</h3>
			    <p class="loading-subtitle-space">토비라이프 AI를 초기화중입니다..</p>
			   </div>
			  </div>
			 </div>
			 <!-- ====================================================== -->
			 <!-- END: 새로운 우주 테마 로딩 인디케이터 -->
			 <!-- ====================================================== -->
			{/if}
			
			{#if iframeError}
			 <div class="error-container">
			  <div class="error-wrapper">
			   <div class="error-icon">
			    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			     <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			    </svg>
			   </div>
			   <h3 class="error-title">연결 오류</h3>
			   <p class="error-text">토비라이프 AI 챗봇을 불러올 수 없습니다.</p>
			   <p class="error-subtext">네트워크 연결을 확인하고 다시 시도해주세요.</p>
			   <button class="retry-button" on:click={() => { iframeError = false; isIframeLoading = true; }}>
			    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			     <path d="M1 4V10H7M23 20V14H17M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14L18.36 18.36A9 9 0 0 1 3.51 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			    </svg>
			    다시 시도
			   </button>
			  </div>
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
			 on:load={() => { 
			  if (checkFlag) { 
			   hasLoadedOnce = true; // iframe이 한번 로드되었음을 기록
			   if (!showLoadingMinTime) {
			    // 3초 로딩 시간이 지난 경우에만 로딩 화면 숨김
			    isIframeLoading = false; 
			   }
			  } 
			 }}
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
	 width: 63px;
	 height: 63px;
	 background: linear-gradient(135deg, #FBBF24 0%, #F59E0B 50%, #F97316 100%);
	 color: white;
	 border: 3px solid rgba(255, 255, 255, 0.8);
	 border-radius: 50%;
	 cursor: pointer;
	 transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
	 position: relative;
	 overflow: hidden;
	 animation: bounceAttention 3s ease-in-out infinite;
	 padding: 0;
	 }
	
	/* Glow effect base */
	.chat-button::before {
	 content: none;
	}
	
	/* Subtle pulse animation */
	@keyframes subtlePulse {
	 0%, 100% {
	  transform: scale(1);
	  box-shadow: 0 4px 24px rgba(124, 58, 237, 0.25), 0 2px 8px rgba(0, 0, 0, 0.08);
	 }
	 50% {
	  transform: scale(1.03);
	  box-shadow: 0 6px 28px rgba(124, 58, 237, 0.3), 0 3px 12px rgba(0, 0, 0, 0.1);
	 }
	}
	
	/* 눈에 띄는 바운스 애니메이션 */
	@keyframes bounceAttention {
	 0%, 100% {
	  transform: scale(1) translateY(0);
	 }
	 25% {
	  transform: scale(1.1) translateY(-5px);
	 }
	 75% {
	  transform: scale(0.95) translateY(2px);
	 }
	}
		
	.chat-button:active {
	 transform: translateY(-1px) scale(1.02);
	}
	
	.chat-button.active {
	 background: linear-gradient(135deg, #DC2626 0%, #F87171 50%, #FCA5A5 100%);
	 animation: activePulse 2s ease-in-out infinite;
	}
	
	/* Active pulse animation */
	@keyframes activePulse {
	 0%, 100% {
	  box-shadow: 0 4px 24px rgba(220, 38, 38, 0.25), 0 2px 8px rgba(0, 0, 0, 0.08);
	 }
	 50% {
	  box-shadow: 0 6px 32px rgba(220, 38, 38, 0.35), 0 3px 12px rgba(0, 0, 0, 0.12);
	 }
	}
	
	/* Chat icon styling */
	.chat-icon {
	 width: calc(100% - 6px);
	 height: calc(100% - 6px);
	 object-fit: cover;
	 border-radius: 50%;
	}
	
	@keyframes float {
	 0%, 100% {
	  transform: translateY(0);
	 }
	 50% {
	  transform: translateY(-3px);
	 }
	}
	
	/* 챗봇 텍스트 배지 */
	.chat-badge {
	 position: absolute;
	 bottom: -17px;
	 left: 50%;
	 transform: translateX(-50%);
	 background: linear-gradient(135deg, #376fe9 0%, #376fe9 100%);
	 color: white;
	 padding: 4px 12px;
	 border-radius: 15px;
	 font-size: 12px;
	 font-weight: bold;
	 white-space: nowrap;
	 box-shadow: 
	  0 0 10px #376fe9,
	  0 0 20px #376fe9,
	  0 4px 12px rgba(0, 0, 0, 0.3);
	 z-index: 2;
	 animation: pulseBadge 2s ease-in-out infinite;
	}
	
	@keyframes pulseBadge {
	 0%, 100% {
	  transform: translateX(-50%) scale(1);
	 }
	 50% {
	  transform: translateX(-50%) scale(1.05);
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
	 position: absolute !important;
	 top: 20px;
	 right: 20px;
	 width: 40px;
	 height: 40px;
	 border-radius: 50%;
	 background: rgba(0, 0, 0, 0.85) !important;
	 -webkit-backdrop-filter: blur(8px);
	 backdrop-filter: blur(8px);
	 border: none !important;
	 color: white;
	 display: flex;
	 align-items: center;
	 justify-content: center;
	 cursor: pointer;
	 z-index: 10001;
	 transition: all 0.2s ease;
	 box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
	 /* 오버플로우 숨김 방지 */
	 overflow: hidden;
	 /* 모바일 터치 최적화 */
	 -webkit-tap-highlight-color: transparent;
	 /* 차단 자동 스타일 제거 */
	 -webkit-appearance: none;
	 -moz-appearance: none;
	 appearance: none;
	 outline: none !important;
	 padding: 0;
	 margin: 0;
	}
	
	/* 자식 요소가 배경을 벗어나지 않도록 */
	.mobile-close-button::before,
	.mobile-close-button::after {
	 content: none !important;
	 display: none !important;
	}
	
	.mobile-close-button:hover {
	 background: rgba(0, 0, 0, 0.9);
	 transform: scale(1.05);
	}
	
	.mobile-close-button:active {
	 transform: scale(0.95);
	 background: rgba(0, 0, 0, 0.8);
	}
	
	/* 닫기 버튼 SVG 스타일 */
	.mobile-close-button svg {
	 width: 24px;
	 height: 24px;
	 pointer-events: none;
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
		
		/* 별 배경 생성 - 풍성한 별똥별들 */
		.stars, .stars2, .stars3 {
		 position: absolute;
		 top: 0;
		 left: 0;
		 right: 0;
		 bottom: 0;
		 width: 100%;
		 height: 100%;
		}
		
		/* 별 모양 만들기 위한 기본 스타일 */
		.stars::before, .stars2::before, .stars3::before {
		 content: '★';
		 position: absolute;
		 color: #FFD700;
		 text-shadow: 0 0 6px #FFD700;
		}
		
		/* 첫 번째 레이어 - 큰 별들 */
		.stars::before {
		 font-size: 20px;
		 left: 10%;
		 animation: star-fall-1 15s ease-in-out infinite;
		}
		.stars::after {
		 content: '★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★';
		 position: absolute;
		 font-size: 18px;
		 color: #FFF8DC;
		 text-shadow: 0 0 5px #FFF8DC;
		 letter-spacing: 50px;
		 white-space: nowrap;
		 left: -20%;
		 animation: star-fall-2 20s ease-in-out infinite;
		}
		
		/* 두 번째 레이어 - 중간 별들 */
		.stars2::before {
		 content: '★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★';
		 font-size: 14px;
		 color: #FFFACD;
		 text-shadow: 0 0 4px #FFFACD;
		 letter-spacing: 40px;
		 white-space: nowrap;
		 left: 30%;
		 animation: star-fall-3 25s ease-in-out infinite;
		}
		.stars2::after {
		 content: '✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦';
		 position: absolute;
		 font-size: 12px;
		 color: #FFE5E5;
		 text-shadow: 0 0 3px #FFE5E5;
		 letter-spacing: 35px;
		 white-space: nowrap;
		 left: -40%;
		 animation: star-fall-4 30s ease-in-out infinite;
		}
		
		/* 세 번째 레이어 - 작고 많은 별들 */
		.stars3::before {
		 content: '· · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·';
		 font-size: 16px;
		 color: #FFFFFF;
		 text-shadow: 0 0 2px #FFFFFF;
		 letter-spacing: 25px;
		 white-space: nowrap;
		 left: 50%;
		 animation: star-fall-5 35s ease-in-out infinite;
		}
		.stars3::after {
		 content: '★ ✦ ★ ✦ ★ ✦ ★ ✦ ★ ✦ ★ ✦ ★ ✦ ★ ✦ ★ ✦ ★ ✦ ★ ✦ ★ ✦ ★ ✦ ★ ✦ ★ ✦ ★ ✦';
		 position: absolute;
		 font-size: 10px;
		 color: #FFF0F5;
		 text-shadow: 0 0 2px #FFF0F5;
		 letter-spacing: 30px;
		 white-space: nowrap;
		 left: -30%;
		 animation: star-fall-6 40s ease-in-out infinite;
		}
		
		/* 눈 내리듯 떨어지는 별 애니메이션들 */
		@keyframes star-fall-1 {
		 from { 
		  transform: translateY(0vh) translateX(0px);
		  opacity: 1;
		 }
		 to { 
		  transform: translateY(100vh) translateX(30px);
		  opacity: 0.3;
		 }
		}
		
		@keyframes star-fall-2 {
		 from { 
		  transform: translateY(0vh) translateX(0px);
		  opacity: 0.9;
		 }
		 to { 
		  transform: translateY(100vh) translateX(-20px);
		  opacity: 0.2;
		 }
		}
		
		@keyframes star-fall-3 {
		 from { 
		  transform: translateY(0vh) translateX(0px);
		  opacity: 0.95;
		 }
		 to { 
		  transform: translateY(100vh) translateX(25px);
		  opacity: 0.3;
		 }
		}
		
		@keyframes star-fall-4 {
		 from { 
		  transform: translateY(0vh) translateX(0px);
		  opacity: 0.85;
		 }
		 to { 
		  transform: translateY(100vh) translateX(-35px);
		  opacity: 0.2;
		 }
		}
		
		@keyframes star-fall-5 {
		 from { 
		  transform: translateY(0vh) translateX(0px);
		  opacity: 0.8;
		 }
		 to { 
		  transform: translateY(100vh) translateX(40px);
		  opacity: 0.25;
		 }
		}
		
		@keyframes star-fall-6 {
		 from { 
		  transform: translateY(0vh) translateX(0px);
		  opacity: 0.9;
		 }
		 to { 
		  transform: translateY(100vh) translateX(-45px);
		  opacity: 0.2;
		 }
		}
		
		
		/* 별 반짝임 효과 */
		@keyframes twinkle {
		 0%, 100% { 
		  opacity: 1; 
		  transform: scale(1);
		 }
		 50% { 
		  opacity: 0.5; 
		  transform: scale(0.8);
		 }
		}
		
		
		/* ====================================================== */
		/* START: 새로운 우주 테마 로딩 스타일                    */
		/* ====================================================== */
		
		.loading-container-space {
		 position: absolute;
		 top: 0; left: 0; right: 0; bottom: 0;
		 background: oklch(0.19 0.015 var(--hue));
		 display: flex;
		 align-items: center;
		 justify-content: center;
		 z-index: 20;
		 overflow: hidden;
		}
		
		.loading-wrapper-space {
		 position: relative;
		 width: 100%;
		 height: 100%;
		 display: flex;
		 flex-direction: column;
		 align-items: center;
		 justify-content: center;
		}
		/* 달 스타일 */
		.moon {
		 position: absolute;
		 top: 15%;
		 right: 15%;
		 transform: translate(50%, -50%);
		 animation: moon-glow 4s ease-in-out infinite;
		 filter: drop-shadow(0 0 15px rgba(247, 243, 227, 0.7));
		}
		
		@keyframes moon-glow {
		 0%, 100% { transform: translate(50%, -50%) scale(1); }
		 50% { transform: translate(50%, -50%) scale(1.05); }
		}
		
		/* 우주선 컨테이너 */
		.rocket-container {
		 position: absolute;
		 bottom: 30%;
		 left: 50%;
		 transform: translateX(-50%);
		 width: 150px;
		 height: 150px;
		 animation: fly-to-moon 40s ease-in-out infinite;
		}
		
		@keyframes fly-to-moon {
		 0% {
		  transform: translateX(-50%) translateY(0) rotate(0deg) scale(0.5);
		  opacity: 0;
		 }
		 5% {
		  transform: translateX(-50%) translateY(0) rotate(0deg) scale(1);
		  opacity: 1;
		 }
		 25% {
		  transform: translateX(calc(-50% + 25vw)) translateY(-50px) rotate(10deg) scale(1.1);
		 }
		 50% {
		  transform: translateX(calc(-50% + 50vw)) translateY(-100px) rotate(0deg) scale(1);
		 }
		 75% {
		  transform: translateX(calc(-50% + 75vw)) translateY(-50px) rotate(-10deg) scale(0.9);
		 }
		 95% {
		  transform: translateX(calc(-50% + 100vw + 150px)) translateY(0) rotate(0deg) scale(1);
		  opacity: 1;
		 }
		 100% {
		  transform: translateX(calc(-50% + 100vw + 200px)) translateY(0) rotate(0deg) scale(1);
		  opacity: 0;
		 }
		}
		
		/* 우주선 토비 */
		.rocket-tobi {
		 width: 100%;
		 height: 100%;
		 animation: rocket-wobble 3s ease-in-out infinite;
		}
		
		@keyframes rocket-wobble {
		 0%, 100% {
		  transform: translateY(0) rotate(-5deg);
		 }
		 50% {
		  transform: translateY(-10px) rotate(5deg);
		 }
		}
		
		/* 불꽃 애니메이션 */
		#flames {
		 animation: flame-flicker 0.8s ease-in-out infinite alternate;
		 transform-origin: center top;
		}
		
		@keyframes flame-flicker {
		 0% {
		  transform: scaleY(1) scaleX(1);
		  opacity: 0.8;
		 }
		 100% {
		  transform: scaleY(1.2) scaleX(0.8);
		  opacity: 1;
		 }
		}
		
		/* 토비 캐릭터 애니메이션 */
		#tobi-character {
		 animation: tobi-bounce 4s ease-in-out infinite;
		}
		
		@keyframes tobi-bounce {
		 0%, 100% {
		  transform: translateY(0);
		 }
		 50% {
		  transform: translateY(-5px);
		 }
		}
		
		.loading-text-container-space {
		 text-align: center;
		 color: white;
		 position: absolute;
		 bottom: 15%;
		 left: 50%;
		 transform: translateX(-50%);
		 width: 90%;
		}
		
		.loading-title-space {
		 font-size: 22px;
		 font-weight: 700;
		 margin: 0 0 10px;
		 text-shadow: 0 2px 10px rgba(118, 75, 162, 0.5);
		 animation: fade-in-up 1s ease-out both;
		}
		
		.loading-subtitle-space {
		 font-size: 14px;
		 color: rgba(255, 255, 255, 0.85);
		 margin: 0;
		 text-shadow: 0 1px 5px rgba(118, 75, 162, 0.5);
		 animation: fade-in-up 1s ease-out 0.2s both;
		}
		
		@keyframes fade-in-up {
		 from { opacity: 0; transform: translateY(20px); }
		 to { opacity: 1; transform: translateY(0); }
		}
		
		/* ====================================================== */
		/* END: 새로운 우주 테마 로딩 스타일                      */
		/* ====================================================== */
		
		@keyframes bounce {
		0%, 80%, 100% {
		 transform: scale(0);
		 opacity: 0.5;
		}
		40% {
		 transform: scale(1);
		 opacity: 1;
		}
		}
		
		/* 에러 컨테이너 스타일 */
		.error-container {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 20;
		}
		
		.error-wrapper {
		text-align: center;
		padding: 40px;
		max-width: 320px;
		}
		
		.error-icon {
		width: 80px;
		height: 80px;
		margin: 0 auto 20px;
		background: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
		animation: shake 0.5s ease-in-out;
		}
		
		.error-icon svg {
		color: #ef4444;
		}
		
		.error-title {
		color: white;
		font-size: 24px;
		font-weight: 700;
		margin: 0 0 12px 0;
		}
		
		.error-text {
		color: rgba(255, 255, 255, 0.95);
		font-size: 16px;
		margin: 0 0 8px 0;
		line-height: 1.5;
		}
		
		.error-subtext {
		color: rgba(255, 255, 255, 0.8);
		font-size: 14px;
		margin: 0 0 24px 0;
		}
		
		.retry-button {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 12px 24px;
		background: white;
		color: #ef4444;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		font-size: 16px;
		font-weight: 600;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
		transition: all 0.3s ease;
		}
		
		.retry-button:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
		}
		
		.retry-button:active {
		transform: translateY(0);
		}
		
		.retry-button svg {
		animation: rotate 2s linear infinite paused;
		}
		
		.retry-button:hover svg {
		animation-play-state: running;
		}
		
		@keyframes shake {
		0%, 100% {
		 transform: translateX(0);
		}
		25% {
		 transform: translateX(-10px);
		}
		75% {
		 transform: translateX(10px);
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

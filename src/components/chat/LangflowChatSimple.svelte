<script>
import { afterUpdate, onMount } from "svelte";
import { BlogRAGService } from "./BlogRAGService";
import { ContextDetector } from "./ContextDetector";
import { OptimizedChatService } from "./OptimizedChatService";

let messages = [];
let inputMessage = "";
let isLoading = false;
let chatVisible = false;
let sessionId = null;
let LANGFLOW_API_URL = "";
let marked = null;
let katex = null;
let chatMessagesEl = null;

// Edge Function 사용 여부를 결정하는 플래그
let useEdgeFunction = false;

// 블로그 RAG 서비스 인스턴스
let contextDetector = null;
let blogRAGService = null;

// 채팅 메시지 스크롤을 가장 아래로 이동
function scrollToBottom() {
	if (chatMessagesEl) {
		chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
	}
}

// 메시지가 업데이트될 때마다 스크롤 및 Prism 하이라이팅
afterUpdate(() => {
	scrollToBottom();

	// Prism.js 하이라이팅 적용
	if (typeof Prism !== "undefined") {
		setTimeout(() => {
			Prism.highlightAll();
		}, 100);
	}
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
						displayMode: true,
					});
				} catch (e) {
					return match;
				}
			});
		}

		// 그 다음 마크다운 처리
		let html = marked.parse(processedText);

		// 코드 블록에 복사 버튼 추가
		html = html.replace(/<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g, (match, attrs, code) => {
			// 언어 추출
			const langMatch = attrs.match(/class="language-([^"]+)"/);
			const language = langMatch ? langMatch[1] : "plaintext";

			// HTML 엔티티 디코드
			const decodedCode = code
				.replace(/&lt;/g, "<")
				.replace(/&gt;/g, ">")
				.replace(/&amp;/g, "&")
				.replace(/&quot;/g, '"')
				.replace(/&#39;/g, "'");

			// 고유 ID 생성
			const codeId = `code-${Math.random().toString(36).substr(2, 9)}`;

			return `
    <div class="code-block-wrapper">
     <div class="code-block-header">
      <span class="code-language">${language}</span>
      <button class="copy-button" onclick="copyCode('${codeId}')">
       <i class="fas fa-copy"></i>
       <span class="copy-text">복사</span>
      </button>
     </div>
     <pre><code id="${codeId}" class="language-${language}">${decodedCode}</code></pre>
    </div>
   `;
		});

		return html;
	} catch (error) {
		console.error("Markdown parsing error:", error);
		return text;
	}
}

// 코드 복사 함수
function copyCode(codeId) {
	const codeElement = document.getElementById(codeId);
	if (codeElement) {
		const code = codeElement.textContent;
		navigator.clipboard
			.writeText(code)
			.then(() => {
				// 복사 성공 피드백
				const button =
					codeElement.parentElement.previousElementSibling.querySelector(".copy-button");
				const copyText = button.querySelector(".copy-text");
				copyText.textContent = "복사됨!";
				setTimeout(() => {
					copyText.textContent = "복사";
				}, 2000);
			})
			.catch((err) => {
				console.error("코드 복사 실패:", err);
			});
	}
}

// 전역 함수로 등록
if (typeof window !== "undefined") {
	window.copyCode = copyCode;
}

// 타이핑 효과 함수
async function typeMessage(text, messageIndex) {
	const typingSpeed = 15; // 각 문자 간 딜레이 (ms)
	const words = text.split(" ");
	let currentText = "";

	for (let i = 0; i < words.length; i++) {
		currentText += (i > 0 ? " " : "") + words[i];
		messages[messageIndex] = {
			...messages[messageIndex],
			content: currentText,
			isTyping: i < words.length - 1, // 마지막 단어가 아니면 아직 타이핑 중
		};
		messages = [...messages]; // 리액티비티 트리거

		// 단어 사이에 짧은 딜레이
		await new Promise((resolve) => setTimeout(resolve, typingSpeed));
	}

	// 타이핑 완료 후 isTyping 제거
	messages[messageIndex] = {
		...messages[messageIndex],
		isTyping: false,
	};
	messages = [...messages];
}

// Edge Function 사용 여부 토글
function toggleEdgeFunction() {
	useEdgeFunction = !useEdgeFunction;
	if (useEdgeFunction) {
		LANGFLOW_API_URL = "/api/chat";
	} else {
		LANGFLOW_API_URL = "/.netlify/functions/langflow-proxy";
	}
}

async function sendMessage() {
	if (!inputMessage.trim() || isLoading) return;

	const userMessage = inputMessage;
	inputMessage = "";

	// 사용자 메시지 추가
	messages = [...messages, { role: "user", content: userMessage }];

	// 즉시 로딩 인디케이터를 표시하기 위해 빈 assistant 메시지 추가
	messages = [...messages, { role: "assistant", content: "", isTyping: true, isSearching: false }];

	// 블로그 컨텍스트 감지 및 RAG 검색
	let contextualMessage = userMessage;
	let searchResults = [];
	let isAboutBlog = false;

	// RAG 시스템 - 우선순위에 따른 처리
	// 우선순위 1: "블로그" + "검색" 패턴
	const blogSearchPattern = /(블로그.*검색|검색.*블로그|이\s*블로그|여기|토비라이프)/i;
	const isBlogSearchRequest = blogSearchPattern.test(userMessage);

	if (isBlogSearchRequest && contextDetector && blogRAGService) {
		// 블로그 검색 요청이면 RAG 시스템 사용
		try {
			// 키워드 추출
			const keywords = await contextDetector.extractSearchKeywords(userMessage);

			// 블로그 포스트 검색
			const searchQuery = keywords.join(" ");
			searchResults = await blogRAGService.searchRelevantPosts(searchQuery);

			if (searchResults.length > 0) {
				// LLM 프롬프트에 블로그 컨텍스트 추가
				contextualMessage = blogRAGService.buildContextualPrompt(userMessage, searchResults);
				isAboutBlog = true;
			}
		} catch (error) {
			console.error("Blog search error:", error);
		}
	} else {
		// 우선순위 2: 일반 검색 요청은 langflow-proxy에서 처리
		const searchPatterns =
			/(검색해|알려줘|최신|현재|지금|이번달|올해|오늘|방금|아까|좀전|나중에|아직|벌써|곧|이제|이전에|이후에|다음|항상|늘|내일|어제|모레|글피|그제|지난달|다음달|작년|내년|몇년전|며칠전|요즘|최근|동시에|즉시|당장|시절|한때|날씨|뉴스)/i;
		if (searchPatterns.test(userMessage)) {
			// langflow-proxy에서 자동으로 처리됨
		} else {
		}
	}

	isLoading = true;

	// Edge Function은 더 긴 타임아웃 설정 가능
	const timeoutDuration = useEdgeFunction ? 20000 : 9000;
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

	try {
		// Langflow API 호출
		// 대화 히스토리 최적화 - 성능 향상을 위해 메시지 수와 크기 제한
		const MAX_HISTORY_MESSAGES = 4; // 8개에서 4개로 감소
		const MAX_MESSAGE_LENGTH = 3000; // 각 메시지 최대 길이

		// 메시지 필터링 및 압축
		const recentMessages = messages
			.slice(0, -2) // 현재 입력 중인 메시지와 빈 메시지 제외
			.filter((m) => m.content && !m.isTyping)
			.slice(-MAX_HISTORY_MESSAGES) // 최근 4개만
			.map((m) => ({
				role: m.role,
				content:
					m.content.length > MAX_MESSAGE_LENGTH
						? `${m.content.substring(0, MAX_MESSAGE_LENGTH)}...`
						: m.content,
			}));

		const payload = {
			input_value: contextualMessage, // 컨텍스트가 추가된 메시지 사용
			output_type: "chat",
			input_type: "chat",
			stream: false,
			session_id: sessionId,
			conversation_history: recentMessages.map((m) => ({
				role: m.role,
				content: m.content,
			})),
			tweaks: {},
		};

		const response = await fetch(LANGFLOW_API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
			signal: controller.signal,
		});

		const responseText = await response.text();

		// 복잡도 정보 확인
		const complexity = response.headers.get("X-Query-Complexity");
		const responseTime = response.headers.get("X-Response-Time");

		if (complexity) {
		}

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = JSON.parse(responseText);

		// 검색 수행 여부 확인
		const hasSearchResults = data.hasSearchResults || false;
		if (hasSearchResults) {
		}

		// 응답 파싱 - 다양한 구조 시도
		let botResponse = "Sorry, I could not generate a response.";
		if (data.outputs) {
			// outputs 배열 순회
			if (Array.isArray(data.outputs)) {
				for (const output of data.outputs) {
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

		// <think> 태그 제거
		if (botResponse.includes("<think>")) {
			// <think>...</think> 패턴을 찾아서 제거
			botResponse = botResponse.replace(/<think>.*?<\/think>/gs, "").trim();
		}

		// 블로그 참조 링크 추가
		if (isAboutBlog && searchResults.length > 0) {
			const references = blogRAGService.formatReferences(searchResults);
			botResponse += references;
		}

		// 이미 추가된 assistant 메시지에 타이핑 효과 적용
		// 짧은 딜레이 후 타이핑 시작 (로딩 인디케이터가 보이도록)
		await new Promise((resolve) => setTimeout(resolve, 300));

		// 타이핑 효과 구현 (마지막 메시지 업데이트)
		await typeMessage(botResponse, messages.length - 1);
	} catch (error) {
		clearTimeout(timeoutId);
		console.error("Error calling Langflow API:", error);

		let errorMessage = "죄송합니다. 일시적인 오류가 발생했습니다.";

		if (error.name === "AbortError") {
			errorMessage = useEdgeFunction
				? "Edge Function에서도 타임아웃이 발생했습니다. 질문을 더 간단하게 해주세요."
				: "netlify 무료 플랜을 사용중이라<br>API의 응답시간이 10초 지연시 타임아웃이 발생합니다😭<br>조금만 더 간단한 질문을 해주세요.<br><br>💡 Edge Function 모드로 전환하면 더 긴 시간 처리가 가능합니다!";
		} else if (error.message.includes("401")) {
			errorMessage = "인증 오류가 발생했습니다. API 토큰을 확인해주세요.";
		} else if (error.message.includes("404")) {
			errorMessage = "Flow를 찾을 수 없습니다. Flow ID를 확인해주세요.";
		} else if (error.message.includes("500")) {
			errorMessage = "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
		} else if (error.message.includes("502") || error.message.includes("Bad Gateway")) {
			errorMessage = "Langflow API 서버에 문제가 있습니다. 잠시 후 다시 시도해주세요.";
		} else if (error.message.includes("504") || error.message.includes("timeout")) {
			// 초기 환영 메시지만 남기고 모든 메시지 삭제
			messages = [
				{
					role: "assistant",
					content:
						"안녕하세요!<br>저는 토비라이프 블로그 챗봇입니다.<br>2024년 초반까지의 데이터만 학습된 모델을 사용중입니다.<br>모델명 : qwen-qwq-32b<br><br>🆕 <strong>최신 정보 검색 기능!</strong><br>'최신', '현재', '검색','알려줘' 등의 키워드가 포함된 질문의 경우<br>웹 검색을 통해 최신 정보를 확인하여 답변드립니다.🔍<br><br>📚 <strong>블로그 콘텐츠 RAG 시스템!</strong><br>블로그 관련 질문 시 자동으로 모든 포스트를 참조하여 답변합니다.<br>'이 블로그에서', '토비라이프가 작성한' 등의 표현을 사용해보세요.<br><br>⚡ <strong>RAG 적응형 처리 시스템!</strong><br>질문의 복잡도에 따라 응답 속도를 최적화합니다.<br>단순한 질문은 빠르게, 복잡한 질문은 정확하게 답변드립니다.<br><br>🚀 <strong>Edge Function 모드</strong><br>타임아웃이 자주 발생한다면 Edge Function 모드를 사용해보세요!<br><br>궁금한 점이 있으시면 물어봐주세요.🤖",
				},
			];

			errorMessage =
				"⚠️ 타임아웃이 발생하여 대화 기록을 초기화했습니다.<br><br>더 간단한 질문으로 다시 시작해주세요! 😊";

			// 타임아웃 메시지 추가
			messages = [...messages, { role: "assistant", content: errorMessage, isTyping: false }];
			return; // 추가 처리 중단
		}

		// 이미 추가된 assistant 메시지를 업데이트
		messages[messages.length - 1] = {
			role: "assistant",
			content: errorMessage,
			isTyping: false,
		};
		messages = [...messages]; // 리액티비티 트리거
	} finally {
		clearTimeout(timeoutId);
		isLoading = false;
	}
}

function handleKeyPress(event) {
	if (event.key === "Enter" && !event.shiftKey) {
		event.preventDefault();
		sendMessage();
	}
}

onMount(async () => {
	// 블로그 RAG 서비스 초기화
	contextDetector = new ContextDetector();
	blogRAGService = new BlogRAGService();

	// 비동기로 초기화 (블로킹하지 않음)
	Promise.all([contextDetector.initialize(), blogRAGService.initialize()])
		.then(() => {})
		.catch((error) => {
			console.error("Failed to initialize RAG services:", error);
		});

	// 동적으로 marked와 katex 로드
	try {
		const markedModule = await import("marked");
		marked = markedModule.marked;

		// Marked 설정
		marked.setOptions({
			breaks: true,
			gfm: true,
			headerIds: false,
			mangle: false,
		});

		const katexModule = await import("katex");
		katex = katexModule.default;
	} catch (error) {
		console.error("Failed to load markdown/katex modules:", error);
	}

	// 클라이언트 사이드에서만 실행
	sessionId = `user_${Date.now()}`;

	// 기본값은 일반 Function 사용
	LANGFLOW_API_URL = "/.netlify/functions/langflow-proxy";

	// 초기 환영 메시지
	messages = [
		{
			role: "assistant",
			content:
				"안녕하세요!<br>저는 토비라이프 블로그 챗봇입니다.<br>2024년 초반까지의 데이터만 학습된 모델을 사용중입니다.<br>모델명 : qwen-qwq-32b<br><br>🆕 <strong>최신 정보 검색 기능!</strong><br>'최신', '현재', '검색','알려줘' 등의 키워드가 포함된 질문의 경우<br>웹 검색을 통해 최신 정보를 확인하여 답변드립니다.🔍<br><br>📚 <strong>블로그 콘텐츠 RAG 시스템!</strong><br>블로그 관련 질문 시 자동으로 모든 포스트를 참조하여 답변합니다.<br>'이 블로그에서', '토비라이프가 작성한' 등의 표현을 사용해보세요.<br><br>⚡ <strong>RAG 적응형 처리 시스템!</strong><br>질문의 복잡도에 따라 응답 속도를 최적화합니다.<br>단순한 질문은 빠르게, 복잡한 질문은 정확하게 답변드립니다.<br><br>🚀 <strong>Edge Function 모드</strong><br>타임아웃이 자주 발생한다면 Edge Function 모드를 사용해보세요!<br><br>궁금한 점이 있으시면 물어봐주세요.🤖",
		},
	];

	return () => {
		// Cleanup if needed
	};
});
</script>

<svelte:head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
</svelte:head>
<div class="chat-container">
  <!-- 챗봇 버튼 -->
  <button 
    class="chat-button"
    class:active={chatVisible}
    on:click={() => chatVisible = !chatVisible}
  >
    <!-- 알림 배지 -->
    {#if !chatVisible}
      <span class="notification-badge">3</span>
    {/if}
    
    {#if chatVisible}
      <i class="fas fa-times"></i>
    {:else}
      <i class="fas fa-robot"></i>
    {/if}
  
  </button>
  
  <!-- 챗봇 창 -->
  {#if chatVisible}
    <div class="chat-window">
      <!-- 헤더 -->
      <div class="chat-header">
        <span>토비라이프 블로그 챗봇</span>
        <div class="header-controls">
          <!-- Edge Function 토글 버튼 -->
          <button 
            class="edge-toggle"
            class:active={useEdgeFunction}
            on:click={toggleEdgeFunction}
            title={useEdgeFunction ? 'Edge Function 사용 중' : '일반 Function 사용 중'}
          >
            {#if useEdgeFunction}
              <span class="edge-icon">🚀</span>
            {:else}
              <span class="edge-icon">🖥️</span>
            {/if}
          </button>
          <button on:click={() => chatVisible = false} class="close-button">×</button>
        </div>
      </div>
      
      <!-- 메시지 영역 -->
      <div class="chat-messages" bind:this={chatMessagesEl}>
        {#each messages as message}
          <div class="message {message.role}">
            {#if message.role === 'assistant' && marked && !message.isTyping}
              {@html renderMarkdown(message.content)}
            {:else}
              {message.content}
            {/if}
            
            {#if message.isTyping}
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            {/if}
          </div>
        {/each}
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
          aria-label="메시지 보내기"  >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 20 20" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"  >
            <path d="M2 10L17 2L13 18L11 11L2 10Z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  /* 기존 스타일 유지 */
  .chat-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
  }
  
  .chat-button {
    /* 버튼 기본 스타일 */
    display: flex;
    justify-content: center;
    align-items: center;
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); /* 그라디언트 배경 */
    color: white;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); /* 색상에 맞는 그림자 */
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); /* 부드러운 애니메이션 */
    position: relative;
    overflow: hidden;
  }
  
  /* 호버 효과를 위한 가상 요소 */
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
  
  /* 맥박 애니메이션 */
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
  
  /* 아이콘 회전 애니메이션 */
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
  
  /* 알림 배지 */
  .notification-badge {
    position: absolute;
    top: -5px;
    right: -5px;
    background: #ff4757;
    color: white;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: bold;
    animation: bounce 2s infinite;
    box-shadow: 0 2px 5px rgba(255, 71, 87, 0.5);
  }
  
  /* 바운스 애니메이션 */
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
  
  /* 추가 애니메이션 - 레인보우 효과 */
  @keyframes rainbow {
    0% { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    20% { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
    40% { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
    60% { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
    80% { background: linear-gradient(135deg, #30cfd0 0%, #330867 100%); }
    100% { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
  }
  
  /* 호버 시 레인보우 효과 */
  .chat-button:hover {
    animation: rainbow 3s ease infinite;
    transform: translateY(-3px) scale(1.05);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
  }
  
  /* 리플 효과를 위한 가상 요소 */
  .chat-button::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 5px;
    height: 5px;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 50%;
    transform: translate(-50%, -50%) scale(0);
    animation: ripple 4s infinite;
  }
  @keyframes ripple {
    0% {
      transform: translate(-50%, -50%) scale(0);
      opacity: 1;
    }
    100% {
      transform: translate(-50%, -50%) scale(15);
      opacity: 0;
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
    background-color: #2575d3;
    color: white;
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
  }
  
  .header-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .edge-toggle {
    position: relative;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    overflow: hidden;
    
    /* 기본 상태 (Regular Function) */
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    box-shadow: 0 3px 10px rgba(102, 126, 234, 0.4);
  }
  
  /* Edge Function 활성화 상태 */
  .edge-toggle.active {
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 50%, #f5576c 100%);
    animation: edgePulse 2s infinite, colorShift 4s ease-in-out infinite;
    box-shadow: 0 4px 15px rgba(245, 87, 108, 0.6);
  }
  
  /* 맥박 애니메이션 */
  @keyframes edgePulse {
    0% {
      box-shadow: 0 4px 15px rgba(245, 87, 108, 0.6);
    }
    50% {
      box-shadow: 0 6px 25px rgba(245, 87, 108, 0.8);
    }
    100% {
      box-shadow: 0 4px 15px rgba(245, 87, 108, 0.6);
    }
  }
  
  /* 색상 변화 애니메이션 */
  @keyframes colorShift {
    0%, 100% {
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 50%, #f5576c 100%);
    }
    25% {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #ff6b6b 100%);
    }
    50% {
      background: linear-gradient(135deg, #feca57 0%, #ff9ff3 50%, #ff6b6b 100%);
    }
    75% {
      background: linear-gradient(135deg, #ff9ff3 0%, #feca57 50%, #f093fb 100%);
    }
  }
  
  /* 호버 효과를 위한 가상 요소 */
  .edge-toggle::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    transform: scale(0);
    transition: transform 0.4s ease;
  }
  
  .edge-toggle:hover {
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.5);
  }
  
  .edge-toggle.active:hover {
    box-shadow: 0 4px 20px rgba(240, 147, 251, 0.6);
  }
  
  .edge-toggle:hover::before {
    transform: scale(1);
  }
  
  .edge-toggle:active {
    transform: translateY(0) scale(0.98);
  }
  
  /* 아이콘 스타일 */
  .edge-icon {
    font-size: 20px;
    z-index: 1;
    display: inline-block;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  }
  
  .edge-toggle:hover .edge-icon {
    transform: rotate(360deg) scale(1.2);
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
  }
  
  /* Edge Function 활성화 시 특별 효과 */
  .edge-toggle.active .edge-icon {
    animation: rocketBoost 2s ease-in-out infinite;
  }
  
  @keyframes rocketBoost {
    0%, 100% {
      transform: translateY(0) scale(1);
    }
    25% {
      transform: translateY(-3px) scale(1.1) rotate(5deg);
    }
    50% {
      transform: translateY(-5px) scale(1.15) rotate(-5deg);
    }
    75% {
      transform: translateY(-3px) scale(1.1) rotate(3deg);
    }
  }
  
  /* 리플 효과 */
  .edge-toggle::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 3px;
    height: 3px;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 50%;
    transform: translate(-50%, -50%) scale(0);
    animation: edgeRipple 3s infinite;
  }
  
  @keyframes edgeRipple {
    0% {
      transform: translate(-50%, -50%) scale(0);
      opacity: 1;
    }
    100% {
      transform: translate(-50%, -50%) scale(12);
      opacity: 0;
    }
  }
  
  /* 상태 전환 애니메이션 */
  
  @keyframes toggleSwitch {
    0%, 100% {
      transform: rotate(0deg) scale(1);
    }
    50% {
      transform: rotate(180deg) scale(0.8);
    }
  }
  
  /* 툴팁 스타일 (선택사항) */
  .edge-toggle[title] {
    position: relative;
  }
  
  .edge-toggle[title]:hover::after {
    content: attr(title);
    position: absolute;
    bottom: -35px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    animation: tooltipFade 0.3s ease forwards;
  }
  
  @keyframes tooltipFade {
    to {
      opacity: 1;
    }
  }
  
  .edge-toggle:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }
  
  .edge-toggle.active {
    background: rgba(255, 255, 255, 0.4);
    animation: glow 2s ease-in-out infinite;
  }
  
  @keyframes glow {
    0%, 100% {
      box-shadow: 0 0 5px rgba(255, 255, 255, 0.8);
    }
    50% {
      box-shadow: 0 0 20px rgba(255, 255, 255, 0.8);
    }
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
  
  /* 코드 블록 래퍼 스타일 */
  .message.assistant :global(.code-block-wrapper) {
    position: relative;
    margin: 12px 0;
    border-radius: 8px;
    overflow: hidden;
    background-color: #1e1e1e;
  }
  
  .message.assistant :global(.code-block-header) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px;
    background-color: #2d2d2d;
    border-bottom: 1px solid #3e3e3e;
  }
  
  .message.assistant :global(.code-language) {
    font-size: 12px;
    color: #888;
    text-transform: uppercase;
    font-weight: 500;
  }
  
  .message.assistant :global(.copy-button) {
    background: transparent;
    border: 1px solid #444;
    color: #888;
    padding: 4px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s ease;
  }
  
  .message.assistant :global(.copy-button:hover) {
    background-color: #3e3e3e;
    color: #fff;
    border-color: #666;
  }
  
  .message.assistant :global(.copy-button i) {
    font-size: 12px;
  }
  
  /* Prism 테마 오버라이드 - 코드 블록 래퍼 내부 */
  .message.assistant :global(.code-block-wrapper pre) {
    background-color: #1e1e1e !important;
    border: none;
    border-radius: 0;
    margin: 0;
    padding: 16px !important;
  }
  
  .message.assistant :global(.code-block-wrapper pre code) {
    background-color: transparent;
    color: #d4d4d4;
    font-size: 14px;
    line-height: 1.6;
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
    display: inline-flex;
    gap: 4px;
    margin-left: 8px;
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
    font-size: 16px; /* iOS 자동 확대 방지 */
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

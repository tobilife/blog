<script>
import { afterUpdate, onMount } from "svelte";
import { BlogListHelper } from "./BlogListHelper";
import { BlogRAGService } from "./BlogRAGService";
import { ContextDetector } from "./ContextDetector";
import { OptimizedChatService } from "./OptimizedChatService";

let messages = [];
let inputMessage = "";
let isLoading = false;
let chatVisible = false;
let sessionId = null;
let marked = null;
let katex = null;
let chatMessagesEl = null;

// Astra DB 최적화 서비스
let optimizedChatService = null;
let useAstraOptimization = true; // 기본값: Astra DB 최적화 사용

// 비동기 작업 상태
let activeTaskId = null;
let taskProgress = 0;
let taskStatusMessage = "";
let isPolling = false;

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
			processedText = processedText.replace(
				/\$\$([^\$]+)\$\$/g,
				(match, math) => {
					try {
						return katex.renderToString(math, {
							throwOnError: false,
							displayMode: true,
						});
					} catch (e) {
						return match;
					}
				},
			);
		}

		// 그 다음 마크다운 처리
		let html = marked.parse(processedText);

		// 코드 블록에 복사 버튼 추가
		html = html.replace(
			/<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g,
			(match, attrs, code) => {
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
			},
		);

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
					codeElement.parentElement.previousElementSibling.querySelector(
						".copy-button",
					);
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

// Astra DB 최적화 토글 (항상 활성화)
// function toggleAstraOptimization() {
// 	useAstraOptimization = !useAstraOptimization;
// 	console.log(
// 		`🚀 Astra DB 최적화: ${useAstraOptimization ? "활성화" : "비활성화"}`,
// 	);
// }

// 비동기 작업 폴링
async function pollTaskStatus(taskId, messageIndex) {
	if (!taskId || isPolling) return;

	isPolling = true;
	const maxPollingTime = 30000; // 최대 30초
	const pollingInterval = 1000; // 1초마다 확인
	const startTime = Date.now();

	while (Date.now() - startTime < maxPollingTime) {
		try {
			const status = await optimizedChatService.checkTaskStatus(taskId);

			// 진행률 업데이트
			taskProgress = status.progress || 0;
			taskStatusMessage = status.message || "처리 중...";

			// 메시지 업데이트
			messages[messageIndex] = {
				...messages[messageIndex],
				isAsync: true,
				taskProgress,
				taskStatusMessage,
			};
			messages = [...messages];

			if (status.status === "completed" && status.result) {
				// 작업 완료 - 결과를 타이핑 효과로 표시
				activeTaskId = null;
				taskProgress = 0;
				taskStatusMessage = "";

				messages[messageIndex] = {
					...messages[messageIndex],
					isAsync: false,
					content: "",
				};
				messages = [...messages];

				// 타이핑 효과 적용
				await typeMessage(status.result, messageIndex);
				break;
			}
			if (status.status === "failed") {
				// 작업 실패
				activeTaskId = null;
				taskProgress = 0;
				taskStatusMessage = "";

				messages[messageIndex] = {
					...messages[messageIndex],
					isAsync: false,
					content: status.error || "처리 중 오류가 발생했습니다.",
					isTyping: false,
				};
				messages = [...messages];
				break;
			}

			// 다음 폴링까지 대기
			await new Promise((resolve) => setTimeout(resolve, pollingInterval));
		} catch (error) {
			console.error("Task polling error:", error);
			break;
		}
	}

	isPolling = false;
}

async function sendMessage() {
	if (!inputMessage.trim() || isLoading) return;

	const userMessage = inputMessage;
	inputMessage = "";

	// 사용자 메시지 추가
	messages = [...messages, { role: "user", content: userMessage }];

	// 즉시 로딩 인디케이터를 표시하기 위해 빈 assistant 메시지 추가
	const messageIndex = messages.length;
	messages = [
		...messages,
		{ role: "assistant", content: "", isTyping: true, isSearching: false },
	];

	// 블로그 컨텍스트 감지 및 RAG 검색
	let contextualMessage = userMessage;
	let searchResults = [];
	let isAboutBlog = false;

	// 모든 메시지에 기본 지침 추가
	const baseInstructions =
		"\n\n[중요 지침]\n" +
		"- 블로그 이름은 '토비라이프' 또는 'TobiLife'입니다 (TobyLife 아님)\n" +
		"- 모든 대화에서 이 이름을 정확히 사용하세요\n" +
		"- 당신은 토비라이프가 개발한 LLM이 아닌, 토비라이프에 의해 추가 학습 및 RAG 적용된 AI 챗봇입니다.\n" +
		"- 블로그 주소는 https://tobilife.netlify.app 입니다\n" +
		"- URL을 표시할 때는 공백을 두거나 <> 기호로 감싸서 표시하세요\n";
	// 나머지 코드는 그대로...

	// RAG 시스템 - 우선순위에 따른 처리
	// 우선순위 1: "블로그" + "검색" 패턴
	const blogSearchPattern =
		/(블로그.*검색|검색.*블로그|이\s*블로그|여기|토비라이프)/i;
	const isBlogSearchRequest = blogSearchPattern.test(userMessage);

	if (isBlogSearchRequest && contextDetector && blogRAGService) {
		// 블로그 검색 요청이면 RAG 시스템 사용
		try {
			console.log("☝️ 블로그 검색 요청 감지!");

			// 블로그 목록 요청인지 확인
			if (BlogListHelper.isBlogListRequest(userMessage)) {
				console.log("📝 블로그 목록 요청으로 확인됨");

				// 모든 포스트 가져오기
				if (blogRAGService.knowledgeBase?.posts) {
					const blogListResponse = BlogListHelper.formatBlogList(
						blogRAGService.knowledgeBase.posts,
					);

					// 직접 응답 표시
					await typeMessage(blogListResponse, messageIndex);
					isLoading = false;
					return; // 일반 LLM 호출을 건너뛰기
				}
			}

			// 키워드 추출
			const keywords = await contextDetector.extractSearchKeywords(userMessage);
			console.log("Extracted keywords:", keywords);

			// 블로그 포스트 검색
			const searchQuery = keywords.join(" ");
			searchResults = await blogRAGService.searchRelevantPosts(searchQuery);
			console.log(`Found ${searchResults.length} blog posts`);

			if (searchResults.length > 0) {
				console.log(
					"Blog search results:",
					searchResults.map((r) => ({
						title: r.post.title,
						score: r.score,
					})),
				);

				// LLM 프롬프트에 블로그 컨텍스트 추가
				contextualMessage = blogRAGService.buildContextualPrompt(
					userMessage,
					searchResults,
				);
				isAboutBlog = true;
			} else {
				// 블로그 검색 결과가 없어도 기본 지침 추가
				contextualMessage = userMessage + baseInstructions;
			}
		} catch (error) {
			console.error("Blog search error:", error);
			contextualMessage = userMessage + baseInstructions;
		}
	} else {
		// 블로그 검색이 아닌 경우에도 기본 지침 추가
		contextualMessage = userMessage + baseInstructions;
	}

	isLoading = true;

	try {
		// 대화 히스토리 최적화
		const MAX_HISTORY_MESSAGES = 4;
		const MAX_MESSAGE_LENGTH = 3000;

		const recentMessages = messages
			.slice(0, -2)
			.filter((m) => m.content && !m.isTyping)
			.slice(-MAX_HISTORY_MESSAGES)
			.map((m) => ({
				role: m.role,
				content:
					m.content.length > MAX_MESSAGE_LENGTH
						? `${m.content.substring(0, MAX_MESSAGE_LENGTH)}...`
						: m.content,
			}));

		// Astra DB 최적화 항상 사용
		if (optimizedChatService) {
			console.log("🚀 Astra DB 최적화 모드로 메시지 전송");

			const response = await optimizedChatService.sendMessage({
				input_value: contextualMessage,
				session_id: sessionId,
				conversation_history: recentMessages,
			});

			// 모든 응답을 동기 처리로 간주
			if (response.type === "sync" || response.type === "async") {
				// 캐시 히트 또는 즉시 완료
				if (response.cacheHit) {
					console.log("🎯 Cache hit!");
				}
				await new Promise((resolve) => setTimeout(resolve, 300));
				const parsedResponse = optimizedChatService.parseResponse(
					response.data,
				);

				// 블로그 참조 링크 추가
				let finalResponse = parsedResponse;
				if (isAboutBlog && searchResults.length > 0) {
					const references = blogRAGService.formatReferences(searchResults);
					finalResponse += references;
				}

				await typeMessage(finalResponse, messageIndex);
			}
			/* 비동기 처리 비활성화
			else if (response.type === "async") {
			 // 비동기 처리 시작
			 activeTaskId = response.taskId;
			 console.log(`📋 비동기 작업 시작: ${activeTaskId}`);
			 
			 // 비동기 상태 표시
			 messages[messageIndex] = {
			  ...messages[messageIndex],
			  isAsync: true,
			  taskStatus: 'pending',
			  progress: 0,
			  isTyping: false
			 };
			 messages = [...messages];
			 
			 // 폴링 시작
			 pollTaskStatus(activeTaskId, messageIndex);
			}
			*/
		} else {
			// 기존 방식으로 처리
			console.log("📡 일반 모드로 메시지 전송");

			const payload = {
				input_value: contextualMessage,
				output_type: "chat",
				input_type: "chat",
				stream: false,
				session_id: sessionId,
				conversation_history: recentMessages,
				tweaks: {},
			};

			const response = await fetch("/.netlify/functions/langflow-proxy-astra", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			const responseText = await response.text();

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = JSON.parse(responseText);

			// 응답 파싱
			let botResponse = "Sorry, I could not generate a response.";
			if (data.outputs && Array.isArray(data.outputs)) {
				for (const output of data.outputs) {
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
				}
			}

			// <think> 태그 제거
			if (botResponse.includes("<think>")) {
				botResponse = botResponse.replace(/<think>.*?<\/think>/gs, "").trim();
			}

			// 블로그 참조 링크 추가
			if (isAboutBlog && searchResults.length > 0) {
				const references = blogRAGService.formatReferences(searchResults);
				botResponse += references;
			}

			// 타이핑 효과 적용
			await new Promise((resolve) => setTimeout(resolve, 300));
			await typeMessage(botResponse, messageIndex);
		}
	} catch (error) {
		console.error("Error calling chat API:", error);
		console.error("Error details:", {
			message: error.message,
			name: error.name,
			response: error.response,
			status: error.status,
		});

		let errorMessage = "죄송합니다. 일시적인 오류가 발생했습니다.";

		if (error.name === "AbortError") {
			errorMessage = "응답 시간이 초과되었습니다. 더 간단한 질문을 해주세요.";
		}
		messages[messageIndex] = {
			role: "assistant",
			content: errorMessage,
			isTyping: false,
		};
		messages = [...messages];
	} finally {
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
	// Astra DB 최적화 서비스 초기화
	optimizedChatService = new OptimizedChatService();

	// 블로그 RAG 서비스 초기화
	contextDetector = new ContextDetector();
	blogRAGService = new BlogRAGService();

	// 비동기로 초기화 (블로킹하지 않음)
	Promise.all([contextDetector.initialize(), blogRAGService.initialize()])
		.then(() => {
			console.log("✅ Blog RAG services initialized");
		})
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

	// 초기 환영 메시지
	messages = [
		{
			role: "assistant",
			content:
				"안녕하세요!<br>저는 토비라이프 블로그 챗봇입니다.<br><br>🚀 <strong>Astra DB 최적화 기능!</strong><br>- 응답 캐싱으로 빠른 답변 제공<br>- 복잡한 질문은 비동기 처리로 타임아웃 방지<br><br>📚 <strong>블로그 콘텐츠 RAG 시스템!</strong><br>블로그 관련 질문 시<br>자동으로 모든 포스트를 참조하여 답변합니다.<br><br>🔍 <strong>최신 정보 검색 기능!</strong><br>웹 검색을 통해 최신 정보를 확인하여 답변드립니다.<br>특정주제에 대해 '검색' 해줘라고 해보세요😊<br><br>궁금한 점이 있으시면 물어봐주세요!🤖",
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
    {#if !chatVisible}
      <span class="notification-badge">AI</span>
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
          <!-- Astra DB 최적화 상태 표시 (항상 활성화) -->
          <div 
            class="astra-status active"
            title="Astra DB 최적화 사용 중"
          >
            <span class="astra-icon">⚡</span>
          </div>
          <button on:click={() => chatVisible = false} class="close-button">×</button>
        </div>
      </div>
      
      <!-- 메시지 영역 -->
      <div class="chat-messages" bind:this={chatMessagesEl}>
        {#each messages as message}
          <div class="message {message.role}">
            {#if message.isAsync}
              <!-- 비동기 처리 중 표시 -->
              <div class="async-message">
                <div class="async-content">
                  <i class="fas fa-hourglass-half"></i> 복잡한 질문을 처리하는 중입니다...
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: {taskProgress}%"></div>
                </div>
                <div class="async-status">
                  <span class="status-icon">⏳</span>
                  <span class="status-text">{taskStatusMessage}</span>
                </div>
              </div>
            {:else if message.role === 'assistant' && marked && !message.isTyping}
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
          disabled={isLoading || isPolling}
        />
        <button 
          class="send-button" 
          on:click={sendMessage}
          disabled={!inputMessage.trim() || isLoading || isPolling}
          aria-label="메시지 보내기"
        >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 20 20" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
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
  
  /* Astra DB 상태 표시 스타일 */
  .astra-status {
    position: relative;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: linear-gradient(135deg, #f7b733 0%, #fc4a1a 100%);
    color: white;
    box-shadow: 0 4px 15px rgba(252, 74, 26, 0.6);
    animation: astraPulse 2s infinite;
  }
  
  @keyframes astraPulse {
    0% {
      box-shadow: 0 4px 15px rgba(252, 74, 26, 0.6);
    }
    50% {
      box-shadow: 0 6px 25px rgba(252, 74, 26, 0.8);
    }
    100% {
      box-shadow: 0 4px 15px rgba(252, 74, 26, 0.6);
    }
  }
  
  .astra-icon {
    font-size: 20px;
    z-index: 1;
    display: inline-block;
    animation: lightning 1.5s ease-in-out infinite;
  }
  
  @keyframes lightning {
    0%, 100% {
      transform: translateY(0) scale(1);
    }
    25% {
      transform: translateY(-2px) scale(1.1);
    }
    50% {
      transform: translateY(0) scale(1.2);
    }
    75% {
      transform: translateY(-1px) scale(1.1);
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
  
  /* 비동기 메시지 스타일 */
  .async-message {
    position: relative;
  }
  
  .async-content {
    margin-bottom: 8px;
  }
  
  .progress-bar {
    width: 100%;
    height: 4px;
    background-color: #e0e0e0;
    border-radius: 2px;
    margin: 8px 0;
    overflow: hidden;
  }
  
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #4A90E2 0%, #667eea 100%);
    border-radius: 2px;
    transition: width 0.3s ease;
    position: relative;
    overflow: hidden;
  }
  
  .progress-fill::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.3),
      transparent
    );
    animation: shimmer 1.5s infinite;
  }
  
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
  
  .async-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #666;
    margin-top: 4px;
  }
  
  .status-icon {
    font-size: 14px;
    animation: spin 2s linear infinite;
  }
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  .status-text {
    font-style: italic;
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

<script>
import { afterUpdate, onMount } from "svelte";
import FeedbackButtons from "../ui/FeedbackButtons.svelte";
import FeedbackModal from "../ui/FeedbackModal.svelte";
import Toast from "../ui/Toast.svelte";
import { BlogListHelper } from "./BlogListHelper";
import { BlogRAGService } from "./BlogRAGService";
import { ChainOfThoughtService } from "./ChainOfThoughtService";
import { ContextDetector } from "./ContextDetector";
import { FeedbackService } from "./FeedbackService";
import { IntentClassifier } from "./IntentClassifier";
import { OptimizedChatService } from "./OptimizedChatService";
import { buildChatPrompt, buildSearchPrompt } from "./SearchPromptBuilder";

let messages = [];
let inputMessage = "";
let isLoading = false;
let chatVisible = false;
let sessionId = null;
let marked = null;
let katex = null;
let chatMessagesEl = null;

// 웹 검색 활성화 상태
let enableWebSearch = false;

// 로컬 스토리지에서 사용자 설정 불러오기
if (typeof window !== "undefined") {
 const savedWebSearchPref = localStorage.getItem("enableWebSearch");
 if (savedWebSearchPref !== null) {
  enableWebSearch = savedWebSearchPref === "true";
 }
}

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

// 의도 분류 시스템
let intentClassifier = null;
let chainOfThoughtService = null;

// 피드백 시스템
let feedbackService = null;
let showToast = false;
let toastMessage = "";
let toastType = "success";
let showFeedbackModal = false;
let currentFeedbackMessageId = null;
let messageFeedbacks = {}; // 메시지별 피드백 상태 저장

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
} // <-- 여기에 닫는 중괄호 } 가 추가되었습니다.

// 전역 함수로 등록
if (typeof window !== "undefined") {
 window.copyCode = copyCode;
}

// 웹 검색 토글 함수
function toggleWebSearch() {
 enableWebSearch = !enableWebSearch;
 // 로컬 스토리지에 저장
 if (typeof window !== "undefined") {
  localStorage.setItem("enableWebSearch", enableWebSearch.toString());
 }
}

// 피드백 처리 함수들
async function handleFeedback(event) {
	const { messageId, value } = event.detail;
	const message = messages.find((m) => m.id === messageId);

	if (!message || !message.cacheKey) {
		console.warn("No cache key found for message", messageId);
		return;
	}

	// 즉시 UI 업데이트
	messageFeedbacks[messageId] = value;
	messages = [...messages];

	// 피드백이 있으면 모달 열기
	if (value !== 0) {
		currentFeedbackMessageId = messageId;
		showFeedbackModal = true;
	} else {
		// 피드백 취소
		const result = await feedbackService.cancelFeedback(message.cacheKey);
		if (result.success) {
			showToastMessage("피드백이 취소되었습니다.", "info");
		}
	}
}

async function handleFeedbackSubmit(event) {
	const { reason, comment } = event.detail;
	const messageId = currentFeedbackMessageId;
	const message = messages.find((m) => m.id === messageId);

	if (!message || !message.cacheKey) {
		return;
	}

	const feedback = messageFeedbacks[messageId];
	const fullComment = reason + (comment ? `: ${comment}` : "");

	// 서버에 피드백 제출
	const result = await feedbackService.submitFeedback(message.cacheKey, feedback, fullComment);

	if (result.success) {
		showToastMessage("피드백이 제출되었습니다. 감사합니다!", "success");

		// 품질 점수가 낮아서 삭제된 경우
		if (result.deleted) {
			message.deleted = true;
			message.deletionReason = "품질 점수가 낮아 자동 삭제되었습니다.";
			messages = [...messages];
		}
	} else {
		showToastMessage("피드백 제출에 실패했습니다.", "error");
	}

	showFeedbackModal = false;
	currentFeedbackMessageId = null;
}

function showToastMessage(message, type = "success") {
	toastMessage = message;
	toastType = type;
	showToast = true;
}

// 기본 지침 생성 함수
function generateBaseInstructions() {
	let instructions =
		"\n\n[중요 지침]\n" +
		"- 블로그 이름은 '토비라이프' 또는 'TobiLife'입니다 (TobyLife 아님)\n" +
		"- 모든 대화에서 이 이름을 정확히 사용하세요\n" +
		"- 당신은 토비라이프가 개발한 LLM이 아닌, 토비라이프에 의해 추가 학습 및 RAG 적용된 AI 챗봇입니다\n" +
		"- 블로그 주소는 https://tobilife.netlify.app 입니다\n" +
		"- URL을 표시할 때는 공백을 두거나 < https://tobilife.netlify.app > 기호로 감싸서 표시하세요\n";

	// BlogRAGService가 초기화되고 데이터가 있으면 동적으로 게시물 목록 추가
	if (blogRAGService?.knowledgeBase?.posts && blogRAGService.knowledgeBase.posts.length > 0) {
		instructions += "- 블로그의 실제 게시물:\n";

		// 최신순으로 정렬
		const sortedPosts = [...blogRAGService.knowledgeBase.posts].sort(
			(a, b) => new Date(b.published) - new Date(a.published),
		);

		for (const [index, post] of sortedPosts.entries()) {
			const date = new Date(post.published).toLocaleDateString("ko-KR");
			instructions += `  ${index + 1}. '${post.title}' (${date}, ${post.category} 카테고리)\n`;
		}

		instructions += "- 블로그 글 목록을 요청받으면 위의 실제 게시물들을 참조하여 답변하세요\n";
	} else {
		// 기본 게시물 정보 (폴백)
		instructions +=
			"- 블로그의 실제 게시물:\n" +
			"  1. 'Sim Studio: 코딩 없이 만드는 AI 에이전트 워크플로우' (2025-05-27, AI 카테고리)\n" +
			"  2. '30분 만에 만드는 우리 회사 전용 AI 검색 시스템 - 무료로 구축하는 RAG 지식베이스' (2025-04-13, AI 카테고리)\n" +
			"  3. 'Git/GitHub 명령어 가이드' (2024-02-18, Git&GitHub 카테고리)\n" +
			"- 블로그 글 목록을 요청받으면 위의 실제 게시물들을 참조하여 답변하세요\n";
	}

	return instructions;
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
//  useAstraOptimization = !useAstraOptimization;
//  console.log(
//    `🚀 Astra DB 최적화: ${useAstraOptimization ? "활성화" : "비활성화"}`,
//  );
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

	// 사용자 메시지 추가 (ID 포함)
	const userMessageId = `msg_${Date.now()}_user`;
	messages = [
		...messages,
		{
			id: userMessageId,
			role: "user",
			content: userMessage,
		},
	];

	// 즉시 로딩 인디케이터를 표시하기 위해 빈 assistant 메시지 추가
	const messageIndex = messages.length;
	const assistantMessageId = `msg_${Date.now()}_assistant`;
	messages = [
		...messages,
		{
			id: assistantMessageId,
			role: "assistant",
			content: "",
			isTyping: true,
			isSearching: false,
		},
	];

	// 의도 분류 시스템을 통한 질문 분석
	let contextualMessage = userMessage;
	let searchResults = [];
	let isAboutBlog = false;
	let requiresWebSearch = false;
	let intentClassification = null;

	// 모든 메시지에 기본 지침 추가 (동적으로 생성)
	const baseInstructions = generateBaseInstructions();

	// 1단계: 의도 분류
	if (intentClassifier) {
		intentClassification = intentClassifier.classifyIntent(userMessage);

		// 검색 필요 여부 표시
		if (intentClassification.searchRequired) {
			messages[messageIndex] = {
				...messages[messageIndex],
				isSearching: true,
			};
			messages = [...messages];
		}
	}

	// 1.5단계: Chain of Thought 처리 (복잡한 질문인 경우)
	let cotDecomposition = null;
	if (chainOfThoughtService && intentClassification?.intent === "search") {
		cotDecomposition = await chainOfThoughtService.decomposeQuestion(userMessage);

		if (cotDecomposition.needsDecomposition) {
			// CoT 처리 중임을 표시
			messages[messageIndex] = {
				...messages[messageIndex],
				isCoT: true,
				cotProgress: 0,
				cotSubQuestions: cotDecomposition.subQuestions,
			};
			messages = [...messages];

			// 하위 질문들을 순차적으로 처리
			const subAnswers = [];
			for (const [index, subQ] of cotDecomposition.subQuestions.entries()) {
				// 진행 상황 업데이트
				messages[messageIndex] = {
					...messages[messageIndex],
					cotProgress: ((index + 1) / cotDecomposition.subQuestions.length) * 100,
					cotCurrentQuestion: subQ.question,
				};
				messages = [...messages];

				// 각 하위 질문에 대해 웹 검색 수행
				const subAnswer = await chainOfThoughtService.searchForSubQuestion(subQ);
				subAnswers.push(subAnswer);

				// 약간의 딜레이 추가 (시각적 효과)
				await new Promise((resolve) => setTimeout(resolve, 500));
			}

			// 답변 종합
			const synthesis = chainOfThoughtService.synthesizeAnswers(
				cotDecomposition.originalQuery,
				subAnswers,
			);

			// 종합된 답변을 컨텍스트에 추가
			contextualMessage = chainOfThoughtService.formatSynthesizedAnswer(synthesis);

			// CoT 완료 표시
			messages[messageIndex] = {
				...messages[messageIndex],
				isCoT: false,
				cotComplete: true,
			};
			messages = [...messages];
		}
	}

	// 2단계: 의도에 따른 처리
	if (intentClassification?.intent === "blog") {
		// 블로그 관련 질문 처리
		try {
			// 블로그 목록 요청인지 확인
			if (BlogListHelper.isBlogListRequest(userMessage)) {
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

			// 키워드 추출 및 블로그 포스트 검색
			const keywords = await contextDetector.extractSearchKeywords(userMessage);

			const searchQuery = keywords.join(" ");
			searchResults = await blogRAGService.searchRelevantPosts(searchQuery);

			if (searchResults.length > 0) {
				// LLM 프롬프트에 블로그 컨텍스트 추가
				contextualMessage = blogRAGService.buildContextualPrompt(userMessage, searchResults);
				isAboutBlog = true;
			} else {
				// 블로그 검색 결과가 없어도 기본 지침 추가
				contextualMessage = userMessage + baseInstructions;
			}
		} catch (error) {
			console.error("Blog search error:", error);
			contextualMessage = userMessage + baseInstructions;
		}
	} else if (intentClassification?.intent === "search") {
		// 웹 검색이 필요한 질문 처리
		requiresWebSearch = true;

		// 검색 쿼리 최적화
		const optimizedQuery = intentClassifier.optimizeSearchQuery(userMessage, intentClassification);

		// 웹 검색 실행 - 실제 검색은 langflow-proxy-astra에서 수행됨
		if (!chainOfThoughtService) {
			chainOfThoughtService = new ChainOfThoughtService();
		}

		// langflow-proxy-astra가 검색을 수행하므로, 여기서는 사용자 메시지만 전달
		contextualMessage = userMessage;
	} else {
		// 일반 대화 (검색 불필요)
		contextualMessage = buildChatPrompt(userMessage) + baseInstructions;
	}

	// 검색 상태 업데이트
	if (requiresWebSearch) {
		messages[messageIndex] = {
			...messages[messageIndex],
			isSearching: false, // 검색 완료 후 업데이트
		};
		messages = [...messages];
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
		 console.log("🔍 웹검색 토글 상태:", enableWebSearch);
		 const response = await optimizedChatService.sendMessage({
		  input_value: contextualMessage,
		  session_id: sessionId,
		  conversation_history: recentMessages,
		  enableWebSearch: enableWebSearch, // 웹 검색 플래그 추가
		  tweaks: {},
		 });

			// 모든 응답을 동기 처리로 간주
			if (response.type === "sync" || response.type === "async") {
				// 캐시 히트 또는 즉시 완료
				if (response.cacheHit) {
				}
				await new Promise((resolve) => setTimeout(resolve, 300));
				const parsedResponse = optimizedChatService.parseResponse(response.data);

				// 블로그 참조 링크 추가
				let finalResponse = parsedResponse;
				if (isAboutBlog && searchResults.length > 0) {
					const references = blogRAGService.formatReferences(searchResults);
					finalResponse += references;
				}

				// cacheKey 저장 (피드백을 위해)
				if (response.data?.cacheKey) {
					messages[messageIndex] = {
						...messages[messageIndex],
						cacheKey: response.data.cacheKey,
					};
					messages = [...messages];
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
         const payload = {
          input_value: contextualMessage,
          output_type: "chat",
          input_type: "chat",
          stream: false,
          session_id: sessionId,
          conversation_history: recentMessages,
          enableWebSearch: enableWebSearch, // 웹 검색 플래그 추가
          tweaks: {},
         };

			// enableWebSearch에 따른 URL 결정
			const apiUrl = enableWebSearch ? "/api/chat" : "/.netlify/functions/langflow-proxy-astra";
			console.log(`🌐 Web Search: ${enableWebSearch ? 'ON' : 'OFF'}, Using: ${apiUrl}`);
			
			const response = await fetch(apiUrl, {
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

	// 피드백 서비스 초기화
	feedbackService = new FeedbackService();

	// 블로그 RAG 서비스 초기화
	contextDetector = new ContextDetector();
	blogRAGService = new BlogRAGService();

	// 의도 분류 시스템 초기화
	intentClassifier = new IntentClassifier();
	chainOfThoughtService = new ChainOfThoughtService();

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

	// 초기 환영 메시지
	messages = [
		{
			role: "assistant",
			content:
			 "안녕하세요!<br>저는 토비라이프 블로그 챗봇입니다.<br><br>🌐 <strong>웹 검색 기능!</strong><br>- 입력창 옆 지구본 아이콘으로 웹 검색 ON/OFF<br>- 비활성화 시: 빠른 AI 답변 (기본값)<br>- 활성화 시: 실시간 정보 검색<br><br>🚀 <strong>AI 기반 지능형 대화 시스템!</strong><br>- 질문 의도를 분석하여 최적의 답변 제공<br>- 블로그 관련 질문은 모든 포스트 참조<br><br>무엇이든 물어보세요! 🤖",
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
            {:else if message.isCoT}
              <!-- Chain of Thought 처리 중 표시 -->
              <div class="cot-message">
                <div class="cot-header">
                  <i class="fas fa-brain"></i> 복잡한 질문을 단계별로 분석하고 있습니다...
                </div>
                <div class="cot-questions">
                  {#each message.cotSubQuestions as subQ, idx}
                    <div class="cot-question" class:active={message.cotCurrentQuestion === subQ.question}>
                      <span class="cot-number">{idx + 1}</span>
                      <span class="cot-text">{subQ.question}</span>
                      {#if message.cotCurrentQuestion === subQ.question}
                        <span class="cot-loader"></span>
                      {/if}
                    </div>
                  {/each}
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: {message.cotProgress}%"></div>
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
            
            {#if message.role === 'assistant' && message.cacheKey && !message.isTyping && !message.deleted}
              <FeedbackButtons
                messageId={message.id}
                currentFeedback={messageFeedbacks[message.id] || 0}
                on:feedback={handleFeedback}
              />
            {/if}
            
            {#if message.deleted}
              <div class="deletion-notice">
                <i class="fas fa-exclamation-triangle"></i>
                {message.deletionReason}
              </div>
            {/if}
            </div>
        {/each}
      </div>
      
      <!-- 입력 영역 -->
      <div class="chat-input-container">
        <!-- 웹 검색 토글 버튼 -->
        <button
          class="web-search-toggle"
          class:active={enableWebSearch}
          on:click={toggleWebSearch}
          title={enableWebSearch ? "웹 검색 활성화됨" : "웹 검색 비활성화됨"}
          aria-label="웹 검색 토글"
        >
          <i class="fas fa-globe"></i>
        </button>
        
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

{#if showToast}
  <Toast
    message={toastMessage}
    type={toastType}
    on:close={() => showToast = false}
  />
{/if}

{#if showFeedbackModal}
  <FeedbackModal
    bind:visible={showFeedbackModal}
    currentFeedback={messageFeedbacks[currentFeedbackMessageId] || 0}
    on:submit={handleFeedbackSubmit}
  />
{/if}

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
  
  /* Chain of Thought 스타일 */
  .cot-message {
    position: relative;
    padding: 16px;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    border-radius: 8px;
  }
  
  .cot-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    font-weight: 600;
    color: #2c3e50;
  }
  
  .cot-header i {
    font-size: 20px;
    color: #667eea;
    animation: pulse 2s infinite;
  }
  
  .cot-questions {
    margin-bottom: 16px;
  }
  
  .cot-question {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    margin-bottom: 8px;
    background: white;
    border-radius: 6px;
    border: 1px solid #e1e4e8;
    transition: all 0.3s ease;
  }
  
  .cot-question.active {
    background: #667eea;
    color: white;
    border-color: #667eea;
    transform: translateX(4px);
  }
  
  .cot-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: #667eea;
    color: white;
    border-radius: 50%;
    font-size: 12px;
    font-weight: bold;
  }
  
  .cot-question.active .cot-number {
    background: white;
    color: #667eea;
  }
  
  .cot-text {
    flex: 1;
    font-size: 14px;
  }
  
  .cot-loader {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
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
    gap: 8px;
    align-items: center;
  }
  
  /* 웹 검색 토글 버튼 스타일 */
  .web-search-toggle {
    width: 40px;
    height: 40px;
    border: 1px solid #e0e0e0;
    background-color: #f5f5f5;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    color: #666;
  }
  
  .web-search-toggle:hover {
    background-color: #e8e8e8;
    border-color: #999;
  }
  
  .web-search-toggle.active {
    background-color: #4A90E2;
    color: white;
    border-color: #4A90E2;
    box-shadow: 0 2px 8px rgba(74, 144, 226, 0.3);
  }
  
  .web-search-toggle.active:hover {
    background-color: #357ABD;
    border-color: #357ABD;
  }
  
  .web-search-toggle i {
    font-size: 18px;
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
  
  
  /* 삭제 알림 스타일 */
  .deletion-notice {
    margin-top: 8px;
    padding: 8px 12px;
    background-color: #fee;
    border: 1px solid #fcc;
    border-radius: 4px;
    color: #c33;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .deletion-notice i {
    font-size: 14px;
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

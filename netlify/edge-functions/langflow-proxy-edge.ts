import type { Config, Context } from "https://edge.netlify.com";

// 타입 정의
interface QualityScores {
	completeness: number;
	relevance: number;
	structure: number;
	references: number;
	length: number;
}

interface QualityWeights {
	completeness: number;
	relevance: number;
	structure: number;
	references: number;
	length: number;
}

interface EvaluationResult {
	scores: QualityScores;
	totalScore: number;
	needsImprovement: boolean;
	reasons: string[];
}

interface ConversationMessage {
	role: "user" | "assistant";
	content: string;
}

interface SearchResult {
	title: string;
	description: string;
	url: string;
	score?: number;
}

interface CacheEntry {
	answer: string;
	context?: Record<string, unknown>;
	timestamp: string;
	expiresAt?: string;
}

interface UsageStats {
	date_key: string;
	total_requests: number;
	google_search_count: number;
	tavily_search_count: number;
	brave_search_count: number;
	tts_requests: number;
	stt_requests: number;
	last_updated: string;
}

// 응답 품질 평가 클래스
class ResponseQualityEvaluator {
	private weights: QualityWeights = {
		completeness: 0.3,
		relevance: 0.25,
		structure: 0.2,
		references: 0.15,
		length: 0.1,
	};
	private minQualityScore = 0.7;

	evaluateResponse(
		response: string,
		query: string,
		hasSearchResults = false,
	): EvaluationResult {
		const scores = {
			completeness: this.evaluateCompleteness(response, query),
			relevance: this.evaluateRelevance(response, query),
			structure: this.evaluateStructure(response),
			references: hasSearchResults ? 0.8 : 0.5,
			length: this.evaluateLength(response),
		};

		const totalScore = Object.entries(scores).reduce((total, [key, score]) => {
			return total + score * this.weights[key as keyof QualityWeights];
		}, 0);

		return {
			totalScore: Math.round(totalScore * 100) / 100,
			scores,
			shouldCache: totalScore >= this.minQualityScore,
			confidence:
				totalScore >= 0.8 ? "high" : totalScore >= 0.6 ? "medium" : "low",
		};
	}

	private evaluateCompleteness(response: string, query: string): number {
		let score = 0.5;
		if (!response.trim().endsWith("?")) score += 0.1;
		if (response.length > 100) score += 0.2;
		if (response.includes(query.split(" ")[0])) score += 0.2;
		return Math.min(score, 1);
	}

	private evaluateRelevance(response: string, query: string): number {
		let score = 0.5;
		const queryWords = query.toLowerCase().split(/\s+/);
		const responseWords = response.toLowerCase().split(/\s+/);
		const matchCount = queryWords.filter((word) =>
			responseWords.includes(word),
		).length;
		score += (matchCount / queryWords.length) * 0.5;
		return Math.min(score, 1);
	}

	private evaluateStructure(response: string): number {
		let score = 0.5;
		if (response.includes("\n\n")) score += 0.2;
		if (/<[^>]+>/.test(response)) score += 0.15;
		if (/[-*•]\s+/.test(response)) score += 0.15;
		return Math.min(score, 1);
	}

	private evaluateLength(response: string): number {
		const length = response.length;
		if (length < 50) return 0.2;
		if (length > 3000) return 0.6;
		if (length >= 200 && length <= 1000) return 1;
		return 0.8;
	}
}

// Astra DB 캐시 클래스
class AstraDBCache {
	private baseUrl: string;
	private token: string;
	private keyspace: string;

	constructor(baseUrl: string, token: string, keyspace: string) {
		this.baseUrl = baseUrl;
		this.token = token;
		this.keyspace = keyspace;
	}

	private generateCacheKey(question: string): string {
		return question.toLowerCase().trim().replace(/\s+/g, " ");
	}

	async getCacheEntry(question: string): Promise<CacheEntry | null> {
		const cacheKey = this.generateCacheKey(question);
		const url = `${this.baseUrl}/api/rest/v2/keyspaces/${this.keyspace}/chat_cache/${encodeURIComponent(cacheKey)}`;

		try {
			const response = await fetch(url, {
				method: "GET",
				headers: {
					"X-Cassandra-Token": this.token,
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				if (response.status === 404) {
					return null;
				}
				throw new Error(`Cache fetch error: ${response.status}`);
			}

			const result = await response.json();
			// Astra DB 응답 형식 처리
			const data = result.data || [result];
			if (data && data.length > 0) {
				const entry = data[0];
				const expiresAt = new Date(entry.expires_at);
				if (expiresAt > new Date()) {
					return {
						hit: true,
						answer: entry.response,
						complexity: entry.complexity,
						createdAt: entry.created_at,
					};
				}
			}
			return null;
		} catch (error) {
			console.error("Cache get error:", {
				error: error.message,
				stack: error.stack,
				cacheKey,
				url: url.replace(this.token, "***TOKEN***"),
			});
			return null;
		}
	}
	async setCacheEntry(
		question: string,
		answer: string,
		context: Record<string, unknown> = {},
	): Promise<boolean> {
		const cacheKey = this.generateCacheKey(question);
		const ttlSeconds = 3600; // 1시간
		const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

		const data = {
			query: question,
			response: answer,
			created_at: new Date().toISOString(),
			expires_at: expiresAt,
			complexity: String(context.complexity || 0),
			has_search: context.hasSearchResults || false,
			popularity: 1,
			response_time: context.responseTime || 0,
			// 품질 관련 필드 추가
			quality_score: context.qualityScore || 0,
			confidence_level: context.confidence || "low",
			quality_details: JSON.stringify(context.qualityDetails || {}),
			user_feedback: 0,
			feedback_count: 0,
			last_validated: new Date().toISOString(),
			version: 1,
		};

		const url = `${this.baseUrl}/api/rest/v2/keyspaces/${this.keyspace}/chat_cache/${encodeURIComponent(cacheKey)}`;

		try {
			const response = await fetch(url, {
				method: "PUT",
				headers: {
					"X-Cassandra-Token": this.token,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			});

			if (response.ok) {
				return true;
			}

			console.error(
				"Cache save error:",
				response.status,
				await response.text(),
			);
			return false;
		} catch (error) {
			console.error("Cache set error:", error);
			return false;
		}
	}
}

// API 사용량 추적 클래스
class ApiUsageTracker {
	private baseUrl: string;
	private token: string;
	private keyspace: string;

	constructor(baseUrl: string, token: string, keyspace: string) {
		this.baseUrl = baseUrl;
		this.token = token;
		this.keyspace = keyspace;
	}

	// 현재 날짜를 YYYY-MM-DD 형식으로 가져오기 (한국 시간 기준)
	private getKoreaDateKey(): string {
		const now = new Date();
		const koreaTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
		const year = koreaTime.getUTCFullYear();
		const month = (koreaTime.getUTCMonth() + 1).toString().padStart(2, "0");
		const day = koreaTime.getUTCDate().toString().padStart(2, "0");
		return `${year}-${month}-${day}`;
	}

	// API 사용량 가져오기
	async getUsageStats(): Promise<UsageStats | null> {
		const dateKey = this.getKoreaDateKey();
		const url = `${this.baseUrl}/api/rest/v2/keyspaces/${this.keyspace}/api_usage_stats/${encodeURIComponent(dateKey)}`;

		try {
			const response = await fetch(url, {
				method: "GET",
				headers: {
					"X-Cassandra-Token": this.token,
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				if (response.status === 404) {
					// 오늘 데이터가 없으면 새로 생성
					return {
						date_key: dateKey,
						google_search_count: 0,
						brave_search_count: 0,
						tavily_search_count: 0,
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
					};
				}
				throw new Error(`Usage stats fetch error: ${response.status}`);
			}

			const result = await response.json();
			// Astra DB 응답 형식 처리
			const data = result.data || [result];
			if (data && data.length > 0) {
				return data[0];
			}

			// 데이터가 없으면 새로 생성
			return {
				date_key: dateKey,
				google_search_count: 0,
				brave_search_count: 0,
				tavily_search_count: 0,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};
		} catch (error) {
			console.error("Get usage stats error:", error);
			// 에러 발생 시 기본값 반환
			return {
				date_key: dateKey,
				google_search_count: 0,
				brave_search_count: 0,
				tavily_search_count: 0,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};
		}
	}

	// API 사용량 업데이트
	async updateUsageStats(
		apiType: "google" | "brave" | "tavily",
	): Promise<boolean> {
		const dateKey = this.getKoreaDateKey();
		const currentStats = await this.getUsageStats();

		// 카운트 증가
		if (apiType === "google") {
			currentStats.google_search_count =
				(currentStats.google_search_count || 0) + 1;
		} else if (apiType === "brave") {
			currentStats.brave_search_count =
				(currentStats.brave_search_count || 0) + 1;
		} else if (apiType === "tavily") {
			currentStats.tavily_search_count =
				(currentStats.tavily_search_count || 0) + 1;
		}

		// PUT 요청을 위한 데이터 준비 - date_key는 URL에 포함되므로 body에서 제외
		const updateData = {
			google_search_count: currentStats.google_search_count || 0,
			brave_search_count: currentStats.brave_search_count || 0,
			tavily_search_count: currentStats.tavily_search_count || 0,
			updated_at: new Date().toISOString(),
			created_at: currentStats.created_at || new Date().toISOString(),
		};

		const url = `${this.baseUrl}/api/rest/v2/keyspaces/${this.keyspace}/api_usage_stats/${encodeURIComponent(dateKey)}`;

		try {
			const response = await fetch(url, {
				method: "PUT",
				headers: {
					"X-Cassandra-Token": this.token,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(updateData),
			});
			if (response.ok) {
				return true;
			}

			console.error(
				"Usage stats update error:",
				response.status,
				await response.text(),
			);
			return false;
		} catch (error) {
			console.error("Update usage stats error:", error);
			console.error("Failed URL:", url);
			console.error("Failed data:", updateData);
			return false;
		}
	}

	// 월간 사용량 체크 (Brave와 Tavily용)
	async getMonthlyUsage(apiType: "brave" | "tavily"): Promise<number> {
		const now = new Date();
		const koreaTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
		const year = koreaTime.getUTCFullYear();
		const month = (koreaTime.getUTCMonth() + 1).toString().padStart(2, "0");

		let totalUsage = 0;

		// 이번 달의 모든 날짜에 대해 사용량 합산
		for (let day = 1; day <= 31; day++) {
			const dateKey = `${year}-${month}-${day.toString().padStart(2, "0")}`;
			const url = `${this.baseUrl}/api/rest/v2/keyspaces/${this.keyspace}/api_usage_stats/${encodeURIComponent(dateKey)}`;

			try {
				const response = await fetch(url, {
					method: "GET",
					headers: {
						"X-Cassandra-Token": this.token,
						"Content-Type": "application/json",
					},
				});

				if (response.ok) {
					const result = await response.json();
					// Astra DB 응답 형식 처리
					const data = result.data || [result];
					if (data && data.length > 0) {
						const stats = data[0];
						if (apiType === "brave") {
							totalUsage += stats.brave_search_count || 0;
						} else if (apiType === "tavily") {
							totalUsage += stats.tavily_search_count || 0;
						}
					}
				}
			} catch (error) {}
		}

		return totalUsage;
	}

	// 사용 가능한 API 결정
	async determineAvailableApi(): Promise<{
		canUseGoogle: boolean;
		canUseBrave: boolean;
		canUseTavily: boolean;
		googleRemaining: number;
		braveRemaining: number;
		tavilyRemaining: number;
	}> {
		const dailyStats = await this.getUsageStats();
		const braveMonthly = await this.getMonthlyUsage("brave");
		const tavilyMonthly = await this.getMonthlyUsage("tavily");

		const googleRemaining = Math.max(
			0,
			99 - (dailyStats.google_search_count || 0),
		);
		const braveRemaining = Math.max(0, 1000 - braveMonthly);
		const tavilyRemaining = Math.max(0, 1000 - tavilyMonthly);

		return {
			canUseGoogle: googleRemaining > 0,
			canUseBrave: braveRemaining > 0,
			canUseTavily: tavilyRemaining > 0,
			googleRemaining,
			braveRemaining,
			tavilyRemaining,
		};
	}
}

// 질문의 복잡도를 분석하는 함수
function analyzeQueryComplexity(query: string) {
	const features = {
		wordCount: query.split(" ").length,
		hasMultipleQuestions: (query.match(/\?/g) || []).length > 1,
		requiresReasoning: /왜|어떻게|분석|비교|설명|차이|장단점|평가/i.test(query),
		requiresLatestInfo: /최신|현재|오늘|요즘|최근|실시간/i.test(query),
		isSimpleFactCheck:
			/무엇|누구|언제|어디|몇/i.test(query) && query.split(" ").length < 8,
		hasComplexTerms: /github|프로그래밍|개발|AI|기술|경제|정치/i.test(query),
	};

	let complexityScore = 0;
	if (features.wordCount > 20) complexityScore += 2;
	if (features.wordCount > 40) complexityScore += 2;
	if (features.hasMultipleQuestions) complexityScore += 3;
	if (features.requiresReasoning) complexityScore += 2;
	if (features.requiresLatestInfo) complexityScore += 1;
	if (features.hasComplexTerms) complexityScore += 1;
	if (features.isSimpleFactCheck) complexityScore -= 2;

	let level: string;
	if (complexityScore <= 1) level = "simple";
	else if (complexityScore <= 4) level = "moderate";
	else level = "complex";

	return {
		score: complexityScore,
		level: level,
		features: features,
		recommendations: {
			timeout: 55000, // Edge Functions는 60초 타임아웃 지원, 55초 사용
			useCache: level === "simple",
			searchLimit: level === "simple" ? 2 : level === "moderate" ? 3 : 5,
			enhancePrompt: level !== "simple",
		},
	};
}

// 질문의 주제를 분석하는 함수
function analyzeQueryIntent(query: string) {
	const lowerQuery = query.toLowerCase();

	// 검색이 필요한 패턴들
	const searchPatterns = [
		/검색해/,
		/검색해줘/,
		/검색/,
		/알려줘/,
		/최신.*뉴스/,
		/뉴스/,
		/현재/,
		/지금/,
		/오늘/,
		/정치/,
		/선거/,
		/대통령/,
		/이재명/,
		/윤석열/,
		/github.*토픽/,
		/깃허브.*토픽/,
		/될거/,
		/될거 같/,
		/될 것 같/,
		// 스포츠 관련 추가
		/순위/,
		/프로야구/,
		/축구/,
		/야구/,
		/경기.*결과/,
		/스포츠/,
		/리그/,
		/시즌/,
		/우승/,
		/1위/,
		/등수/,
		/성적/,
		// 날씨 관련
		/날씨/,
		/기온/,
		/비.*올/,
		/비.*오/,
		/눈.*올/,
		/눈.*오/,
		// 주식/경제 관련
		/주가/,
		/주식/,
		/코스피/,
		/코스닥/,
		/환율/,
		/달러/,
		/원화/,
		// 실시간 정보가 필요한 것들
		/가격/,
		/시세/,
		/요금/,
	];

	const needsSearch = searchPatterns.some((pattern) =>
		pattern.test(lowerQuery),
	);

	return {
		needsSearch,
		originalQuery: query,
	};
}

// 중국어 문자를 제거하는 함수
function removeChinese(text: string): string {
	let result = text;
	result = result.replace(/集中/g, "집중");
	result = result.replace(
		/([\uAC00-\uD7AF\s]+)([\u4E00-\u9FFF]+)([\uAC00-\uD7AF\s]+)/g,
		"$1 $3",
	);
	return result.trim();
}

// 재귀적으로 중국어 제거
function deepRemoveChinese<T>(obj: T): T {
	if (typeof obj === "string") {
		return removeChinese(obj) as T;
	}
	if (Array.isArray(obj)) {
		return obj.map((item) => deepRemoveChinese(item)) as T;
	}
	if (obj !== null && typeof obj === "object") {
		const newObj: Record<string, unknown> = {};
		for (const key in obj) {
			if (Object.hasOwn(obj, key)) {
				newObj[key] = deepRemoveChinese((obj as Record<string, unknown>)[key]);
			}
		}
		return newObj as T;
	}
	return obj;
}

// Brave Search API 호출
async function searchBrave(query: string, apiKey: string) {
	const BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search";

	try {
		const response = await fetch(
			`${BRAVE_API_URL}?q=${encodeURIComponent(query)}&count=3&freshness=pw`,
			{
				headers: {
					Accept: "application/json",
					"Accept-Encoding": "gzip",
					"X-Subscription-Token": apiKey,
				},
			},
		);

		if (!response.ok) {
			console.error("Brave Search API error:", response.status);
			return null;
		}

		const data = await response.json();

		if (data.web?.results) {
			return data.web.results
				.slice(0, 3)
				.map((result: { title: string; description: string; url: string }) => ({
					title: result.title,
					description: result.description,
					url: result.url,
				}));
		}

		return null;
	} catch (error) {
		console.error("Brave Search error:", error);
		return null;
	}
}

// Google Search API 호출
async function searchGoogle(query: string, apiKey: string, cx: string) {
	const GOOGLE_API_URL = "https://www.googleapis.com/customsearch/v1";

	try {
		const response = await fetch(
			`${GOOGLE_API_URL}?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=3`,
			{
				headers: {
					Accept: "application/json",
				},
			},
		);

		if (!response.ok) {
			console.error("Google Search API error:", response.status);
			return null;
		}

		const data = await response.json();

		if (data.items) {
			return data.items
				.slice(0, 3)
				.map((item: { title: string; snippet: string; link: string }) => ({
					title: item.title,
					description: item.snippet,
					url: item.link,
				}));
		}

		return null;
	} catch (error) {
		console.error("Google Search error:", error);
		return null;
	}
}

// Tavily Search API 호출
async function searchTavily(query: string, apiKey: string) {
	const TAVILY_API_URL = "https://api.tavily.com/search";

	try {
		const response = await fetch(TAVILY_API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				api_key: apiKey,
				query: query,
				max_results: 3,
				search_depth: "basic",
				include_raw_content: false,
			}),
		});

		if (!response.ok) {
			console.error("Tavily Search API error:", response.status);
			return null;
		}

		const data = await response.json();

		if (data.results) {
			return data.results
				.slice(0, 3)
				.map((result: { title: string; content: string; url: string }) => ({
					title: result.title,
					description: result.content,
					url: result.url,
				}));
		}

		return null;
	} catch (error) {
		console.error("Tavily Search error:", error);
		return null;
	}
}

// 프롬프트 향상 함수
function enhancePromptWithSearchResults(
	originalQuery: string,
	searchResults: SearchResult[] | null,
	conversationHistory: ConversationMessage[] = [],
) {
	const now = new Date();
	const koreaTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
	const year = koreaTime.getUTCFullYear();
	const month = koreaTime.getUTCMonth() + 1;
	const day = koreaTime.getUTCDate();
	const dayOfWeek = ["일", "월", "화", "수", "목", "금", "토"][
		koreaTime.getUTCDay()
	];

	let enhancedPrompt = "";

	// 시스템 지침을 가장 먼저 추가
	enhancedPrompt += "### 중요 시스템 지침 ###\n";
	enhancedPrompt += `현재 날짜: ${year}년 ${month}월 ${day}일 ${dayOfWeek}요일\n`;
	enhancedPrompt += `이것은 ${year}년 ${month}월 ${day}일 기준 최신 정보입니다.\n`;
	enhancedPrompt += "당신의 기존 지식은 2025년 1월까지의 과거 정보입니다.\n\n";

	// 대화 맥락이 있는 경우 포함
	if (conversationHistory.length > 0) {
		enhancedPrompt += "이전 대화:\n";
		const recentHistory = conversationHistory.slice(-3);
		for (const msg of recentHistory) {
			const content =
				msg.content.length > 100
					? `${msg.content.substring(0, 100)}...`
					: msg.content;
			enhancedPrompt += `${msg.role === "user" ? "U" : "A"}: ${content}\n`;
		}
		enhancedPrompt += "\n";
	}

	enhancedPrompt += `사용자 질문: ${originalQuery}\n\n`;

	if (searchResults && searchResults.length > 0) {
		enhancedPrompt += `### 최신 웹 검색 결과 (${year}년 ${month}월 ${day}일 검색됨) ###\n\n`;

		for (const [index, result] of searchResults.entries()) {
			enhancedPrompt += `[검색결과 ${index + 1}]\n`;
			enhancedPrompt += `제목: ${result.title}\n`;
			enhancedPrompt += `내용: ${result.description}\n`;
			if (result.url) {
				enhancedPrompt += `출처: ${result.url}\n`;
			}
			enhancedPrompt += "\n";
		}

		enhancedPrompt += "### 필수 답변 규칙 ###\n";
		enhancedPrompt += "1. 반드시 위의 검색 결과를 사용하여 답변하세요.\n";
		enhancedPrompt +=
			"2. 검색 결과가 당신의 기존 지식과 다르다면, 검색 결과가 최신 정보입니다.\n";
		enhancedPrompt += `3. "제 지식으로는" 또는 "2025년 1월 기준" 같은 표현을 사용하지 마세요.\n`;
		enhancedPrompt += "4. 검색 결과를 바탕으로 현재 상황을 설명하세요.\n";
		enhancedPrompt += "5. 답변에 출처를 포함할 때는 위의 URL을 참고하세요.\n\n";
	} else {
		enhancedPrompt += "### 답변 지침 ###\n";
		enhancedPrompt += "- 친절하고 도움이 되는 답변을 제공하세요.\n";
		enhancedPrompt +=
			"- 정확한 정보를 제공하되, 불확실한 경우 그렇게 말씀드리세요.\n";
	}

	return enhancedPrompt;
}

export default async (request: Request, context: Context) => {
	const startTime = Date.now();

	// CORS 헤더
	const headers = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	};

	// Preflight 요청 처리
	if (request.method === "OPTIONS") {
		return new Response(null, { status: 200, headers });
	}

	// POST만 허용
	if (request.method !== "POST") {
		return new Response(JSON.stringify({ error: "Method not allowed" }), {
			status: 405,
			headers: { ...headers, "Content-Type": "application/json" },
		});
	}

	try {
		// 환경 변수 가져오기
		const LANGFLOW_API_TOKEN = Deno.env.get("LANGFLOW_API_TOKEN");
		const BRAVE_API_KEY = Deno.env.get("BRAVE_SEARCH_API_KEY");
		const ASTRA_DB_REST_URL = Deno.env.get("ASTRA_DB_REST_URL");
		const ASTRA_DB_APPLICATION_TOKEN = Deno.env.get(
			"ASTRA_DB_APPLICATION_TOKEN",
		);
		const ASTRA_DB_KEYSPACE = Deno.env.get("ASTRA_DB_KEYSPACE");
		const GOOGLE_API_KEY = Deno.env.get("GOOGLE_SEARCH_API_KEY");
		const GOOGLE_CX = Deno.env.get("GOOGLE_SEARCH_CX");
		const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");

		// 모든 환경 변수 목록 확인 (Google 관련만)
		const allEnvVars = Object.keys(Deno.env.toObject());
		const googleRelatedVars = allEnvVars.filter(
			(key) => key.includes("GOOGLE") || key.includes("SEARCH"),
		);

		if (!LANGFLOW_API_TOKEN) {
			throw new Error("LANGFLOW_API_TOKEN is not configured");
		}

		const LANGFLOW_API_URL =
			"https://api.langflow.astra.datastax.com/lf/88f74398-7c51-4066-a0e2-c6a1992f0889/api/v1/run/790574cb-2624-492b-a3a5-e0e118c1416f";

		// 요청 본문 파싱
		const requestBody = await request.json();
		const userQuery = requestBody.input_value || "";
		const conversationHistory = requestBody.conversation_history || [];

		// 빈 쿼리 체크
		if (!userQuery || !userQuery.trim()) {
			return new Response(JSON.stringify({ error: "Query is required" }), {
				status: 400,
				headers: { ...headers, "Content-Type": "application/json" },
			});
		}

		// 복잡도 분석
		const complexity = analyzeQueryComplexity(userQuery);

		// Astra DB 캐시 초기화 및 확인
		let cacheService: AstraDBCache | null = null;
		let cachedResult = null;

		if (ASTRA_DB_REST_URL && ASTRA_DB_APPLICATION_TOKEN && ASTRA_DB_KEYSPACE) {
			try {
				cacheService = new AstraDBCache(
					ASTRA_DB_REST_URL,
					ASTRA_DB_APPLICATION_TOKEN,
					ASTRA_DB_KEYSPACE,
				);
				cachedResult = await cacheService.getCacheEntry(userQuery);

				if (cachedResult?.hit) {
					return new Response(cachedResult.answer, {
						status: 200,
						headers: {
							...headers,
							"Content-Type": "application/json",
							"X-Cache": "HIT",
							"X-Response-Time": String(Date.now() - startTime),
						},
					});
				}
			} catch (cacheError) {
				console.error("Cache service error:", cacheError);
				// 캐시 오류는 무시하고 계속 진행
			}
		}

		// API 사용량 추적기 초기화
		let usageTracker: ApiUsageTracker | null = null;
		if (ASTRA_DB_REST_URL && ASTRA_DB_APPLICATION_TOKEN && ASTRA_DB_KEYSPACE) {
			usageTracker = new ApiUsageTracker(
				ASTRA_DB_REST_URL,
				ASTRA_DB_APPLICATION_TOKEN,
				ASTRA_DB_KEYSPACE,
			);
		}

		let searchResults = null;
		let enhancedQuery = userQuery;
		let searchApiUsed: "google" | "brave" | "tavily" | null = null;

		// 의도 분석
		const intent = analyzeQueryIntent(userQuery);

		// 검색이 필요한 경우
		if (intent.needsSearch) {
			// API 사용 가능 여부 확인
			let apiAvailability = {
				canUseGoogle: true, // 기본값을 true로 변경
				canUseBrave: true, // 기본값을 true로 변경
				canUseTavily: true, // 기본값을 true로 변경
				googleRemaining: 99,
				braveRemaining: 1000,
				tavilyRemaining: 1000,
			};

			if (usageTracker) {
				apiAvailability = await usageTracker.determineAvailableApi();
			} else {
			}

			// Google Search API 우선 사용
			if (GOOGLE_API_KEY && GOOGLE_CX && apiAvailability.canUseGoogle) {
				searchResults = await searchGoogle(
					userQuery,
					GOOGLE_API_KEY,
					GOOGLE_CX,
				);
				if (searchResults) {
					searchApiUsed = "google";
				}
			}

			// Google이 안 되면 Brave + Tavily 동시 검색
			if (!searchResults) {
				// Brave와 Tavily를 동시에 호출
				const searchPromises = [];
				let braveResults = null;
				let tavilyResults = null;

				if (BRAVE_API_KEY && apiAvailability.canUseBrave) {
					searchPromises.push(
						searchBrave(userQuery, BRAVE_API_KEY)
							.then((results) => {
								braveResults = results;
								return { type: "brave", results };
							})
							.catch((err) => {
								console.error("Brave search error:", err);
								return { type: "brave", results: null };
							}),
					);
				}

				if (TAVILY_API_KEY && apiAvailability.canUseTavily) {
					searchPromises.push(
						searchTavily(userQuery, TAVILY_API_KEY)
							.then((results) => {
								tavilyResults = results;
								return { type: "tavily", results };
							})
							.catch((err) => {
								console.error("Tavily search error:", err);
								return { type: "tavily", results: null };
							}),
					);
				}

				// 동시 검색 실행
				if (searchPromises.length > 0) {
					const parallelResults = await Promise.allSettled(searchPromises);

					// 결과 통합 및 정확성 체크
					const combinedResults = [];
					const resultsByUrl = new Map();

					// Brave 결과 처리
					if (braveResults && braveResults.length > 0) {
						for (const result of braveResults) {
							resultsByUrl.set(result.url, {
								...result,
								sources: ["brave"],
								score: 1.0,
							});
						}
					}

					// Tavily 결과 처리 및 비교
					if (tavilyResults && tavilyResults.length > 0) {
						for (const result of tavilyResults) {
							if (resultsByUrl.has(result.url)) {
								// 동일 URL이 있으면 신뢰도 증가
								const existing = resultsByUrl.get(result.url);
								existing.sources.push("tavily");
								existing.score = 1.5; // 두 API에서 모두 반환된 결과는 더 높은 점수
								// 설명 병합 (더 긴 것 사용)
								if (result.description.length > existing.description.length) {
									existing.description = result.description;
								}
							} else {
								resultsByUrl.set(result.url, {
									...result,
									sources: ["tavily"],
									score: 1.0,
								});
							}
						}
					}

					// 점수 기준으로 정렬
					const sortedResults = Array.from(resultsByUrl.values())
						.sort((a, b) => b.score - a.score)
						.slice(0, 3); // 상위 3개만 사용

					if (sortedResults.length > 0) {
						searchResults = sortedResults;
						searchApiUsed =
							braveResults && tavilyResults
								? "brave+tavily"
								: braveResults
									? "brave"
									: "tavily";

						// 결과 품질 로그
						for (const result of searchResults) {
						}
					}
				}
			}

			// 모든 API가 한도 초과한 경우
			if (!searchResults && intent.needsSearch) {
				console.warn("All search APIs exhausted or unavailable");
			}

			// API 사용량 업데이트
			if (searchApiUsed && usageTracker) {
				try {
					if (searchApiUsed === "brave+tavily") {
						// 동시 검색의 경우 두 API 모두 업데이트
						const braveUpdated = await usageTracker.updateUsageStats("brave");
						const tavilyUpdated = await usageTracker.updateUsageStats("tavily");
					} else {
						const updated = await usageTracker.updateUsageStats(
							searchApiUsed as "google" | "brave" | "tavily",
						);
					}
				} catch (error) {
					console.error("Failed to update API usage:", error);
				}
			} else {
			}
		}

		// 프롬프트 향상
		if (searchResults || conversationHistory.length > 0) {
			enhancedQuery = enhancePromptWithSearchResults(
				userQuery,
				searchResults,
				conversationHistory,
			);
			requestBody.hasSearchResults = !!searchResults;
		}

		requestBody.input_value = enhancedQuery;

		// max_tokens 설정
		if (!requestBody.tweaks) {
			requestBody.tweaks = {};
		}
		requestBody.tweaks.ChatOutput = {
			max_tokens:
				complexity.level === "simple"
					? 800
					: complexity.level === "moderate"
						? 1500
						: 2500,
		};

		// Langflow API 호출 (스트리밍 지원)
		const response = await fetch(LANGFLOW_API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${LANGFLOW_API_TOKEN}`,
				Accept: "application/json",
			},
			body: JSON.stringify(requestBody),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error("Langflow API error:", errorText);

			return new Response(
				JSON.stringify({
					error: "Langflow API error",
					status: response.status,
					message: errorText,
				}),
				{
					status: response.status,
					headers: { ...headers, "Content-Type": "application/json" },
				},
			);
		}

		// 응답 처리
		const responseText = await response.text();
		let parsedResponse = JSON.parse(responseText);

		// 중국어 문자 제거
		parsedResponse = deepRemoveChinese(parsedResponse);

		if (requestBody.hasSearchResults) {
			parsedResponse.hasSearchResults = true;
		}

		// 응답 품질 평가 및 캐싱
		if (cacheService) {
			try {
				// 품질 평가기 생성
				const evaluator = new ResponseQualityEvaluator();

				// 응답 텍스트 추출 (JSON에서 실제 응답 텍스트 찾기)
				let responseText = JSON.stringify(parsedResponse);
				if (parsedResponse.outputs?.[0]?.outputs?.[0]?.results?.message?.text) {
					responseText =
						parsedResponse.outputs[0].outputs[0].results.message.text;
				} else if (parsedResponse.result) {
					responseText = parsedResponse.result;
				} else if (parsedResponse.message) {
					responseText = parsedResponse.message;
				}

				// 품질 평가 수행
				const evaluation = evaluator.evaluateResponse(
					responseText,
					userQuery,
					requestBody.hasSearchResults,
				);

				// 품질 기준을 통과한 경우에만 캐싱
				if (evaluation.shouldCache) {
					await cacheService.setCacheEntry(
						userQuery,
						JSON.stringify(parsedResponse),
						{
							complexity: complexity.score,
							hasSearchResults: requestBody.hasSearchResults,
							responseTime: Date.now() - startTime,
							qualityScore: evaluation.totalScore,
							confidence: evaluation.confidence,
							qualityDetails: evaluation.scores, // 품질 평가 세부 점수 추가
						},
					);
				} else {
				}

				// 응답에 품질 정보 추가
				parsedResponse.qualityMetrics = {
					score: evaluation.totalScore,
					confidence: evaluation.confidence,
					cached: evaluation.shouldCache,
				};

				// cacheKey 추가 (피드백용) - generateCacheKey를 public으로 만들어야 함
				const cacheKey = userQuery.toLowerCase().trim().replace(/\s+/g, " ");
				parsedResponse.cacheKey = cacheKey;
			} catch (cacheError) {
				console.error("Cache evaluation/save error:", cacheError);
				// 품질 평가 또는 캐시 저장 실패는 무시
			}
		}

		// API 사용량 정보 추가
		if (usageTracker && searchApiUsed) {
			const currentUsage = await usageTracker.determineAvailableApi();
			parsedResponse.apiUsageInfo = {
				searchApiUsed,
				limits: {
					google: {
						used: 99 - currentUsage.googleRemaining,
						remaining: currentUsage.googleRemaining,
						limit: 99,
						resets: "daily at 00:01 KST",
					},
					brave: {
						used: 1000 - currentUsage.braveRemaining,
						remaining: currentUsage.braveRemaining,
						limit: 1000,
						resets: "monthly on 1st at 00:01 KST",
					},
					tavily: {
						used: 1000 - currentUsage.tavilyRemaining,
						remaining: currentUsage.tavilyRemaining,
						limit: 1000,
						resets: "monthly on 1st at 00:01 KST",
					},
				},
			};
		}

		return new Response(JSON.stringify(parsedResponse), {
			status: 200,
			headers: {
				...headers,
				"Content-Type": "application/json",
				"X-Query-Complexity": complexity.level,
				"X-Response-Time": String(Date.now() - startTime),
				"X-Cache": "MISS",
				"X-Search-API-Used": searchApiUsed || "none",
			},
		});
	} catch (error) {
		console.error("Edge function error:", error);
		return new Response(
			JSON.stringify({
				error: "Internal server error",
				message: error.message,
			}),
			{
				status: 500,
				headers: { ...headers, "Content-Type": "application/json" },
			},
		);
	}
};

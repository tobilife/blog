import type { Config, Context } from "https://edge.netlify.com";

// 응답 품질 평가 클래스
class ResponseQualityEvaluator {
  private weights = {
    completeness: 0.3,
    relevance: 0.25,
    structure: 0.2,
    references: 0.15,
    length: 0.1,
  };
  private minQualityScore = 0.7;

  evaluateResponse(response: string, query: string, hasSearchResults: boolean = false): any {
    const scores = {
      completeness: this.evaluateCompleteness(response, query),
      relevance: this.evaluateRelevance(response, query),
      structure: this.evaluateStructure(response),
      references: hasSearchResults ? 0.8 : 0.5,
      length: this.evaluateLength(response),
    };

    const totalScore = Object.entries(scores).reduce((total, [key, score]) => {
      return total + score * (this.weights as any)[key];
    }, 0);

    return {
      totalScore: Math.round(totalScore * 100) / 100,
      scores,
      shouldCache: totalScore >= this.minQualityScore,
      confidence: totalScore >= 0.8 ? "high" : totalScore >= 0.6 ? "medium" : "low",
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
    const matchCount = queryWords.filter(word => responseWords.includes(word)).length;
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
    return question.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  async getCacheEntry(question: string): Promise<any> {
    const cacheKey = this.generateCacheKey(question);
    const url = `${this.baseUrl}/api/rest/v2/keyspaces/${this.keyspace}/chat_cache/${encodeURIComponent(cacheKey)}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Cassandra-Token': this.token,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log('Cache miss:', cacheKey);
          return null;
        }
        throw new Error(`Cache fetch error: ${response.status}`);
      }

      const result = await response.json();
      if (result.data && result.data.length > 0) {
        const entry = result.data[0];
        const expiresAt = new Date(entry.expires_at);
        if (expiresAt > new Date()) {
          console.log('Cache hit:', cacheKey);
          return {
            hit: true,
            answer: entry.response,
            complexity: entry.complexity,
            createdAt: entry.created_at
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async setCacheEntry(question: string, answer: string, context: any = {}): Promise<boolean> {
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
      confidence_level: context.confidence || 'low',
      quality_details: JSON.stringify(context.qualityDetails || {}),
      user_feedback: 0,
      feedback_count: 0,
      last_validated: new Date().toISOString(),
      version: 1
    };

    const url = `${this.baseUrl}/api/rest/v2/keyspaces/${this.keyspace}/chat_cache/${encodeURIComponent(cacheKey)}`;
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'X-Cassandra-Token': this.token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        console.log('Cache saved:', cacheKey);
        return true;
      }
      
      console.error('Cache save error:', response.status, await response.text());
      return false;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }
}

// 질문의 복잡도를 분석하는 함수
function analyzeQueryComplexity(query: string) {
  const features = {
    wordCount: query.split(" ").length,
    hasMultipleQuestions: (query.match(/\?/g) || []).length > 1,
    requiresReasoning: /왜|어떻게|분석|비교|설명|차이|장단점|평가/i.test(query),
    requiresLatestInfo: /최신|현재|오늘|요즘|최근|실시간/i.test(query),
    isSimpleFactCheck: /무엇|누구|언제|어디|몇/i.test(query) && query.split(" ").length < 8,
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
  ];

  const needsSearch = searchPatterns.some((pattern) => pattern.test(lowerQuery));

  return {
    needsSearch,
    originalQuery: query,
  };
}

// 중국어 문자를 제거하는 함수
function removeChinese(text: string): string {
  let result = text;
  result = result.replace(/集中/g, '집중');
  result = result.replace(/([\uAC00-\uD7AF\s]+)([\u4E00-\u9FFF]+)([\uAC00-\uD7AF\s]+)/g, '$1 $3');
  return result.trim();
}

// 재귀적으로 중국어 제거
function deepRemoveChinese(obj: any): any {
  if (typeof obj === 'string') {
    return removeChinese(obj);
  } else if (Array.isArray(obj)) {
    return obj.map(item => deepRemoveChinese(item));
  } else if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        newObj[key] = deepRemoveChinese(obj[key]);
      }
    }
    return newObj;
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
          "Accept": "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": apiKey,
        },
      }
    );

    if (!response.ok) {
      console.error("Brave Search API error:", response.status);
      return null;
    }

    const data = await response.json();

    if (data.web?.results) {
      return data.web.results.slice(0, 3).map((result: any) => ({
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

// 프롬프트 향상 함수
function enhancePromptWithSearchResults(
  originalQuery: string,
  searchResults: any[] | null,
  conversationHistory: any[] = []
) {
  const now = new Date();
  const koreaTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = koreaTime.getUTCFullYear();
  const month = koreaTime.getUTCMonth() + 1;
  const day = koreaTime.getUTCDate();
  const dayOfWeek = ["일", "월", "화", "수", "목", "금", "토"][koreaTime.getUTCDay()];
  
  let enhancedPrompt = '';
  
  // 대화 맥락이 있는 경우 포함
  if (conversationHistory.length > 0) {
    enhancedPrompt += '이전 대화:\n';
    // 최근 3개의 대화만 포함
    const recentHistory = conversationHistory.slice(-3);
    recentHistory.forEach((msg: any) => {
      const content = msg.content.length > 100 ? 
        msg.content.substring(0, 100) + '...' : msg.content;
      enhancedPrompt += `${msg.role === 'user' ? 'U' : 'A'}: ${content}\n`;
    });
    }
    
    enhancedPrompt += `현재 사용자 질문: ${originalQuery}\n`;
    enhancedPrompt += `현재 날짜: ${year}년 ${month}월 ${day}일 ${dayOfWeek}요일\n\n`;
  

  if (searchResults && searchResults.length > 0) {
    enhancedPrompt += `[웹 검색 결과 - ${year}년 ${month}월 ${day}일 기준]\n\n`;

    for (const [index, result] of searchResults.entries()) {
      enhancedPrompt += `[${index + 1}] ${result.title}\n`;
      const shortDescription = result.description.length > 80
        ? `${result.description.substring(0, 80)}...`
        : result.description;
      enhancedPrompt += `${shortDescription}\n\n`;
    }
  }

  enhancedPrompt += "답변 지침:\n";
  if (searchResults && searchResults.length > 0) {
    enhancedPrompt += "위에 제공된 웹 검색 결과를 반드시 참고하여 답변하세요.\n";
    enhancedPrompt += "자체 지식이 아닌 검색 결과의 내용을 기반으로 현재 상황을 설명하세요.\n";
  }

  return enhancedPrompt;
}

export default async (request: Request, context: Context) => {
  console.log("Edge Function called");
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
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  try {
    // 환경 변수 가져오기
    const LANGFLOW_API_TOKEN = Deno.env.get("LANGFLOW_API_TOKEN");
    const BRAVE_API_KEY = Deno.env.get("BRAVE_SEARCH_API_KEY");
    const ASTRA_DB_REST_URL = Deno.env.get("ASTRA_DB_REST_URL");
    const ASTRA_DB_APPLICATION_TOKEN = Deno.env.get("ASTRA_DB_APPLICATION_TOKEN");
    const ASTRA_DB_KEYSPACE = Deno.env.get("ASTRA_DB_KEYSPACE");
    
    console.log("Environment check:", {
      hasLangflow: !!LANGFLOW_API_TOKEN,
      hasBrave: !!BRAVE_API_KEY,
      hasAstra: !!ASTRA_DB_REST_URL && !!ASTRA_DB_APPLICATION_TOKEN && !!ASTRA_DB_KEYSPACE
    });

    if (!LANGFLOW_API_TOKEN) {
      throw new Error("LANGFLOW_API_TOKEN is not configured");
    }

    const LANGFLOW_API_URL = "https://api.langflow.astra.datastax.com/lf/88f74398-7c51-4066-a0e2-c6a1992f0889/api/v1/run/790574cb-2624-492b-a3a5-e0e118c1416f";

    // 요청 본문 파싱
    const requestBody = await request.json();
    const userQuery = requestBody.input_value || '';
    const conversationHistory = requestBody.conversation_history || [];
    
    // 빈 쿼리 체크
    if (!userQuery || !userQuery.trim()) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }
    
    console.log("User query:", userQuery);
    console.log("Conversation history length:", conversationHistory.length);
    
    // 복잡도 분석
    const complexity = analyzeQueryComplexity(userQuery);
    console.log("Query complexity:", complexity);
    
    // Astra DB 캐시 초기화 및 확인
    let cacheService: AstraDBCache | null = null;
    let cachedResult = null;
    
    if (ASTRA_DB_REST_URL && ASTRA_DB_APPLICATION_TOKEN && ASTRA_DB_KEYSPACE) {
      try {
        cacheService = new AstraDBCache(ASTRA_DB_REST_URL, ASTRA_DB_APPLICATION_TOKEN, ASTRA_DB_KEYSPACE);
        cachedResult = await cacheService.getCacheEntry(userQuery);
        
        if (cachedResult?.hit) {
          console.log('Returning cached response');
          return new Response(
            cachedResult.answer,
            {
              status: 200,
              headers: {
                ...headers,
                "Content-Type": "application/json",
                "X-Cache": "HIT",
                "X-Response-Time": String(Date.now() - startTime)
              },
            }
          );
        }
      } catch (cacheError) {
        console.error('Cache service error:', cacheError);
        // 캐시 오류는 무시하고 계속 진행
      }
    }

    let searchResults = null;
    let enhancedQuery = userQuery;
    
    // 의도 분석
    const intent = analyzeQueryIntent(userQuery);
    console.log("Query intent:", intent);
    
    // 검색이 필요한 경우
    if (BRAVE_API_KEY && intent.needsSearch) {
      console.log("Searching web...");
      searchResults = await searchBrave(userQuery, BRAVE_API_KEY);
      if (searchResults) {
        console.log(`Found ${searchResults.length} search results`);
      }
    }

    // 프롬프트 향상
    if (searchResults || conversationHistory.length > 0) {
      enhancedQuery = enhancePromptWithSearchResults(userQuery, searchResults, conversationHistory);
      requestBody.hasSearchResults = !!searchResults;
    }

    requestBody.input_value = enhancedQuery;

    // max_tokens 설정
    if (!requestBody.tweaks) {
      requestBody.tweaks = {};
    }
    requestBody.tweaks.ChatOutput = {
      max_tokens: complexity.level === "simple" ? 800 : complexity.level === "moderate" ? 1500 : 2500,
    };

    console.log("Forwarding to Langflow...");

    // Langflow API 호출 (스트리밍 지원)
    const response = await fetch(LANGFLOW_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LANGFLOW_API_TOKEN}`,
        "Accept": "application/json",
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
          headers: { ...headers, "Content-Type": "application/json" } 
        }
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
    
    console.log("Response time:", Date.now() - startTime, "ms");
    
    // 응답 품질 평가 및 캐싱
    if (cacheService) {
      try {
        // 품질 평가기 생성
        const evaluator = new ResponseQualityEvaluator();
        
        // 응답 텍스트 추출 (JSON에서 실제 응답 텍스트 찾기)
        let responseText = JSON.stringify(parsedResponse);
        if (parsedResponse.outputs?.[0]?.outputs?.[0]?.results?.message?.text) {
          responseText = parsedResponse.outputs[0].outputs[0].results.message.text;
        } else if (parsedResponse.result) {
          responseText = parsedResponse.result;
        } else if (parsedResponse.message) {
          responseText = parsedResponse.message;
        }
        
        // 품질 평가 수행
        const evaluation = evaluator.evaluateResponse(
          responseText, 
          userQuery, 
          requestBody.hasSearchResults
        );
        
        console.log('Response quality evaluation:', {
          query: userQuery,
          totalScore: evaluation.totalScore,
          shouldCache: evaluation.shouldCache,
          confidence: evaluation.confidence
        });
        
        // 품질 기준을 통과한 경우에만 캐싱
        if (evaluation.shouldCache) {
          await cacheService.setCacheEntry(userQuery, JSON.stringify(parsedResponse), {
            complexity: complexity.score,
            hasSearchResults: requestBody.hasSearchResults,
            responseTime: Date.now() - startTime,
            qualityScore: evaluation.totalScore,
            confidence: evaluation.confidence,
            qualityDetails: evaluation.scores  // 품질 평가 세부 점수 추가
          });
          console.log('Response cached with quality score:', evaluation.totalScore);
        } else {
          console.log('Response not cached due to low quality score:', evaluation.totalScore);
        }
        
        // 응답에 품질 정보 추가
        parsedResponse.qualityMetrics = {
          score: evaluation.totalScore,
          confidence: evaluation.confidence,
          cached: evaluation.shouldCache
        };
        
        // cacheKey 추가 (피드백용) - generateCacheKey를 public으로 만들어야 함
        const cacheKey = userQuery.toLowerCase().trim().replace(/\s+/g, ' ');
        parsedResponse.cacheKey = cacheKey;
        
      } catch (cacheError) {
        console.error('Cache evaluation/save error:', cacheError);
        // 품질 평가 또는 캐시 저장 실패는 무시
      }
    }

    return new Response(
      JSON.stringify(parsedResponse),
      {
        status: 200,
        headers: {
          ...headers,
          "Content-Type": "application/json",
          "X-Query-Complexity": complexity.level,
          "X-Response-Time": String(Date.now() - startTime),
        },
      }
    );

  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error.message,
      }),
      { 
        status: 500, 
        headers: { ...headers, "Content-Type": "application/json" } 
      }
    );
  }
};

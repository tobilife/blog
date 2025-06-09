/**
 * 블로그 컨텍스트 감지 모듈
 * 사용자 질문이 블로그와 관련있는지 판단
 */

export class ContextDetector {
	// 블로그 관련 키워드
	blogKeywords = [
		"이 블로그",
		"여기서",
		"여기에",
		"토비라이프",
		"tobilife",
		"포스트",
		"글",
		"작성한",
		"쓴",
		"올린",
		"블로그 주인",
		"블로그에서",
		"여기 있는",
		"토비라이프가",
		"토비라이프의",
		"목록",
		"어떤",
	];

	// 블로그에 있는 주제들 (동적으로 로드)
	blogTopics = [];
	blogTitles = [];
	blogCategories = [];
	initialized = false;

	// 질문 유형 패턴
	questionPatterns = [
		/.*있(어|나요|니|습니까).*\?$/,
		/.*알려.*줘/,
		/.*설명.*해/,
		/.*뭐(야|에요|예요)/,
		/.*어떤.*인가요/,
		/.*찾아.*줘/,
	];

	/**
	 * 지식베이스에서 토픽 초기화
	 */
	async initialize() {
		if (this.initialized) {
			return;
		}

		try {
			const response = await fetch("/knowledge-base.json");
			if (!response.ok) {
				console.warn("Failed to load knowledge base for context detection");
				return;
			}

			const knowledgeBase = await response.json();

			// 태그 수집
			this.blogTopics = [...knowledgeBase.tags];

			// 카테고리 수집
			this.blogCategories = [...knowledgeBase.categories];

			// 제목에서 키워드 추출
			this.blogTitles = knowledgeBase.posts.map((post) => post.title);

			// 제목에서 주요 단어 추출하여 토픽에 추가
			for (const post of knowledgeBase.posts) {
				// 제목에서 3글자 이상의 단어 추출
				const titleWords = post.title
					.split(/[\s:,\-]/)
					.filter((word) => word.length >= 3)
					.filter((word) => !["코딩", "없이", "만드는", "위한", "하는"].includes(word));

				this.blogTopics.push(...titleWords);
			}

			// 중복 제거
			this.blogTopics = [...new Set(this.blogTopics)];

			this.initialized = true;
		} catch (error) {
			console.error("Failed to initialize ContextDetector:", error);
		}
	}

	/**
	 * 블로그 컨텍스트 점수 계산 (0-1)
	 */
	async calculateContextScore(userMessage) {
		// 초기화 확인
		if (!this.initialized) {
			await this.initialize();
		}
		const lowerMessage = userMessage.toLowerCase();
		let score = 0;

		// 1. 블로그 키워드 체크 (가중치: 0.6)
		const keywordMatches = this.blogKeywords.filter((keyword) => lowerMessage.includes(keyword.toLowerCase())).length;

		if (keywordMatches > 0) {
			score += Math.min(keywordMatches * 0.3, 0.6);
		}

		// 2. 블로그 주제 언급 체크 (가중치: 0.3)
		const topicMatches = this.blogTopics.filter((topic) => lowerMessage.includes(topic.toLowerCase())).length;

		if (topicMatches > 0) {
			score += Math.min(topicMatches * 0.15, 0.3);
		}

		// 3. 질문 유형 체크 (가중치: 0.2)
		const isQuestion = this.questionPatterns.some((pattern) => pattern.test(userMessage));

		if (isQuestion && (keywordMatches > 0 || topicMatches > 0)) {
			score += 0.2;
		}

		return Math.min(score, 1);
	}

	/**
	 * 블로그 관련 질문인지 판단
	 */
	async isAboutBlog(userMessage, threshold = 0.25) {
		// 임계값을 낮춰 더 많은 쿼리를 블로그 컨텍스트로 인식
		const score = await this.calculateContextScore(userMessage);
		return score >= threshold;
	}

	/**
	 * 검색 키워드 추출
	 */
	async extractSearchKeywords(userMessage) {
		// 초기화 확인
		if (!this.initialized) {
			await this.initialize();
		}
		const lowerMessage = userMessage.toLowerCase();

		// "이 블로그", "여기", "토비라이프" 등의 키워드가 있으면 전체 검색
		if (
			lowerMessage.includes("이 블로그") ||
			lowerMessage.includes("여기") ||
			lowerMessage.includes("토비라이프") ||
			lowerMessage.includes("머가") ||
			lowerMessage.includes("뭐가")
		) {
			return ["*"]; // 전체 검색
		}

		const keywords = [];

		// 블로그 주제 키워드 먼저 추출
		for (const topic of this.blogTopics) {
			if (lowerMessage.includes(topic.toLowerCase())) {
				keywords.push(topic);
			}
		}

		// 카테고리 확인
		for (const category of this.blogCategories) {
			if (lowerMessage.includes(category.toLowerCase())) {
				keywords.push(category);
			}
		}

		// "글", "포스트", "작성한" 등이 있으면 전체 검색을 위한 와일드카드 추가
		if (
			lowerMessage.includes("글") ||
			lowerMessage.includes("포스트") ||
			lowerMessage.includes("작성한") ||
			lowerMessage.includes("모든") ||
			lowerMessage.includes("전체")
		) {
			// 키워드가 없으면 모든 포스트를 검색하도록
			if (keywords.length === 0) {
				keywords.push("*"); // 와일드카드로 전체 검색
			}
		}

		// 블로그 관련 키워드 제거하고 핵심 키워드 추출
		let cleanedMessage = lowerMessage;
		for (const keyword of this.blogKeywords) {
			cleanedMessage = cleanedMessage.replace(keyword.toLowerCase(), "");
		}

		// 명사 추출 (간단한 휴리스틱)
		const words = cleanedMessage
			.split(/\s+/)
			.filter((word) => word.length > 2)
			.filter((word) => !["있어", "있나", "알려", "설명", "뭐야", "어떤", "알려줘", "해줘", "보여줘"].includes(word));

		keywords.push(...words);

		// 중복 제거
		const uniqueKeywords = [...new Set(keywords)];

		// 키워드가 하나도 없으면 전체 검색
		return uniqueKeywords.length === 0 ? ["*"] : uniqueKeywords;
	}
}

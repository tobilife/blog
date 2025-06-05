/**
 * 블로그 RAG (Retrieval-Augmented Generation) 서비스
 * 지식베이스에서 관련 포스트를 검색하여 컨텍스트 제공
 */

import Fuse from "fuse.js";

export class BlogRAGService {
	knowledgeBase = null;
	fuse = null;
	initialized = false;

	/**
	 * 지식베이스 초기화
	 */
	async initialize() {
		if (this.initialized) return;

		try {
			// 지식베이스 로드
			const response = await fetch("/knowledge-base.json");
			if (!response.ok) {
				throw new Error("Failed to load knowledge base");
			}

			this.knowledgeBase = await response.json();

			// Fuse.js 검색 인덱스 생성
			const searchData = this.createSearchIndex();

			this.fuse = new Fuse(searchData, {
				keys: [
					{ name: "title", weight: 0.3 },
					{ name: "description", weight: 0.2 },
					{ name: "content", weight: 0.4 },
					{ name: "tags", weight: 0.1 },
				],
				includeScore: true,
				threshold: 0.4,
				minMatchCharLength: 2,
				shouldSort: true,
			});

			this.initialized = true;
			console.log(
				`BlogRAGService initialized with ${this.knowledgeBase.totalPosts} posts`,
			);
		} catch (error) {
			console.error("Failed to initialize BlogRAGService:", error);
			this.initialized = false;
		}
	}

	/**
	 * 검색 인덱스 생성
	 */
	createSearchIndex() {
		if (!this.knowledgeBase) return [];

		const searchData = [];

		for (const post of this.knowledgeBase.posts) {
			// 포스트 레벨 검색 엔트리
			searchData.push({
				type: "post",
				post: post,
				title: post.title,
				description: post.description,
				content: post.summary,
				tags: post.tags.join(" "),
			});

			// 청크 레벨 검색 엔트리
			post.chunks.forEach((chunk, index) => {
				searchData.push({
					type: "chunk",
					post: post,
					chunkIndex: index,
					chunk: chunk,
					title: post.title,
					content: chunk.content,
					tags: post.tags.join(" "),
				});
			});
		}

		return searchData;
	}

	/**
	 * 관련 포스트 검색
	 */
	async searchRelevantPosts(query, maxResults = 3) {
		console.log("searchRelevantPosts called with query:", query);

		if (!this.initialized) {
			await this.initialize();
		}

		if (!this.fuse || !this.knowledgeBase) {
			console.warn("BlogRAGService not properly initialized");
			return [];
		}

		console.log("Knowledge base posts count:", this.knowledgeBase.posts.length);

		// 와일드카드 처리 - 모든 포스트 반환
		if (query === "*" || query.includes("전체") || query.includes("모든")) {
			console.log("Wildcard search detected");
			const results = this.knowledgeBase.posts
				.slice(0, maxResults)
				.map((post, index) => ({
					post: post,
					relevantChunks: post.chunks.slice(0, 1),
					score: index * 0.1, // 순서대로 점수 부여
				}));
			console.log("Wildcard search results:", results.length);
			return results;
		}

		// 쿼리가 비어있거나 짧은 경우 전체 포스트 반환
		if (!query || query.trim().length < 3) {
			console.log("Empty or short query, returning all posts");
			return this.knowledgeBase.posts
				.slice(0, maxResults)
				.map((post, index) => ({
					post: post,
					relevantChunks: post.chunks.slice(0, 1),
					score: index * 0.1,
				}));
		}

		// Fuse.js로 검색
		const searchResults = this.fuse.search(query);

		// 포스트별로 그룹화하고 최고 점수 선택
		const postResultsMap = new Map();

		for (const result of searchResults) {
			const postPath = result.item.post.path;
			const existingResult = postResultsMap.get(postPath);

			if (
				!existingResult ||
				(result.score && result.score < (existingResult.score || 1))
			) {
				const relevantChunks = [];

				// 청크 타입인 경우 해당 청크 추가
				if (result.item.type === "chunk") {
					relevantChunks.push(result.item.chunk);
				} else {
					// 포스트 타입인 경우 첫 번째 청크 추가
					if (result.item.post.chunks.length > 0) {
						relevantChunks.push(result.item.post.chunks[0]);
					}
				}

				postResultsMap.set(postPath, {
					post: result.item.post,
					relevantChunks: relevantChunks,
					score: result.score || 0,
				});
			}
		}

		// 점수순으로 정렬하고 상위 N개 반환
		return Array.from(postResultsMap.values())
			.sort((a, b) => a.score - b.score)
			.slice(0, maxResults);
	}

	/**
	 * LLM 프롬프트에 컨텍스트 추가
	 */
	buildContextualPrompt(userMessage, searchResults) {
	 if (searchResults.length === 0) {
	  return userMessage;
	 }
	
	 // 간결한 컨텍스트 프롬프트
	 let contextPrompt = "토비라이프 블로그에 있는 포스트:\n\n";
	
	 for (const [index, result] of searchResults.entries()) {
	  contextPrompt += `${index + 1}. ${result.post.title}\n`;
	  // description에 HTML 엔티티가 있을 수 있으므로 제거
	  const cleanDescription = result.post.description
	   .replace(/&#x20;/g, " ")
	   .replace(/&amp;/g, "&")
	   .replace(/&lt;/g, "<")
	   .replace(/&gt;/g, ">")
	   .replace(/&quot;/g, '"')
	   .replace(/&#39;/g, "'");
	  contextPrompt += `   - ${cleanDescription}\n`;
	  if (result.post.tags && result.post.tags.length > 0) {
	   contextPrompt += `   - 태그: ${result.post.tags.slice(0, 5).join(", ")}\n`;
	  }
	  contextPrompt += "\n";
	 }
	
	 contextPrompt += `\n질문: ${userMessage}\n`;
	 contextPrompt += "위 블로그 포스트를 참고하여 답변해주세요.\n\n";
	 contextPrompt += "답변 지침:\n";
	 contextPrompt += "- 답변 끝에 '📚 참조한 포스트:' 섹션을 추가하세요\n";
	 contextPrompt += "- 각 포스트는 HTML 링크 형식 <a href=\"URL\" target=\"_blank\" rel=\"noopener noreferrer\">제목</a>으로 작성하세요\n";
	 contextPrompt += "- 예시: <a href=\"/posts/nextjs-getting-started/\" target=\"_blank\" rel=\"noopener noreferrer\">Next.js 시작하기</a>\n";
	 contextPrompt += "- 중요: 외부 링크나 가상의 링크를 만들지 마세요\n";
	 contextPrompt += "- 반드시 위에 제공된 실제 블로그 포스트만 참조하세요\n";
	 contextPrompt += "- 블로그 URL: https://tobilife.netlify.app\n";
	 contextPrompt += "- 경고: tobilife.com, 기술 블로그, 고객센터 등 존재하지 않는 링크를 만들지 마세요\n";
	 contextPrompt += "- 오직 https://tobilife.netlify.app 도메인의 실제 포스트 링크만 사용하세요\n";
	 contextPrompt += "- 추가 정보가 필요하면 위에 제공된 포스트를 참고하도록 안내하세요\n";
	 
	 // 카테고리 정보를 동적으로 추가
	 if (this.knowledgeBase && this.knowledgeBase.categories && this.knowledgeBase.categories.length > 0) {
	  contextPrompt += "\n블로그 카테고리 정보:\n";
	  for (const category of this.knowledgeBase.categories) {
	   contextPrompt += `- ${category}\n`;
	  }
	 }
	
	 return contextPrompt;
	}
	
	/**
	 * 참조 링크 포맷
	 */
	formatReferences(searchResults) {
		if (searchResults.length === 0) return "";

		let references = "\n\n📚 참조한 포스트:\n";

		for (const result of searchResults) {
			// .md 확장자를 제거하고 마지막에 슬래시 추가
			// slug가 있으면 slug 사용, 없으면 path에서 .md 제거
			const slug = result.post.slug || result.post.path.replace(".md", "");
			const postUrl = `/posts/${slug}/`;
			references += `- <a href="${postUrl}" target="_blank" rel="noopener noreferrer">${result.post.title}</a>\n`;
		}

		return references;
	}
}

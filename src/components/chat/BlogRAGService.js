/**
 * 블로그 RAG (Retrieval-Augmented Generation) 서비스
 * 지식베이스에서 관련 포스트를 검색하여 컨텍스트 제공
 */

import Fuse from 'fuse.js';

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
      const response = await fetch('/knowledge-base.json');
      if (!response.ok) {
        throw new Error('Failed to load knowledge base');
      }
      
      this.knowledgeBase = await response.json();
      
      // Fuse.js 검색 인덱스 생성
      const searchData = this.createSearchIndex();
      
      this.fuse = new Fuse(searchData, {
        keys: [
          { name: 'title', weight: 0.3 },
          { name: 'description', weight: 0.2 },
          { name: 'content', weight: 0.4 },
          { name: 'tags', weight: 0.1 }
        ],
        includeScore: true,
        threshold: 0.4,
        minMatchCharLength: 2,
        shouldSort: true
      });
      
      this.initialized = true;
      console.log(`BlogRAGService initialized with ${this.knowledgeBase.totalPosts} posts`);
    } catch (error) {
      console.error('Failed to initialize BlogRAGService:', error);
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
        type: 'post',
        post: post,
        title: post.title,
        description: post.description,
        content: post.summary,
        tags: post.tags.join(' ')
      });
      
      // 청크 레벨 검색 엔트리
      post.chunks.forEach((chunk, index) => {
        searchData.push({
          type: 'chunk',
          post: post,
          chunkIndex: index,
          chunk: chunk,
          title: post.title,
          content: chunk.content,
          tags: post.tags.join(' ')
        });
      });
    }
    
    return searchData;
  }

  /**
   * 관련 포스트 검색
   */
  async searchRelevantPosts(query, maxResults = 3) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (!this.fuse || !this.knowledgeBase) {
      console.warn('BlogRAGService not properly initialized');
      return [];
    }
    
    // 와일드카드 처리 - 모든 포스트 반환
    if (query === '*' || query.includes('전체') || query.includes('모든')) {
      return this.knowledgeBase.posts.slice(0, maxResults).map((post, index) => ({
        post: post,
        relevantChunks: post.chunks.slice(0, 1),
        score: index * 0.1 // 순서대로 점수 부여
      }));
    }
    
    // Fuse.js로 검색
    const searchResults = this.fuse.search(query);
    
    // 포스트별로 그룹화하고 최고 점수 선택
    const postResultsMap = new Map();
    
    for (const result of searchResults) {
      const postPath = result.item.post.path;
      const existingResult = postResultsMap.get(postPath);
      
      if (!existingResult || (result.score && result.score < (existingResult.score || 1))) {
        const relevantChunks = [];
        
        // 청크 타입인 경우 해당 청크 추가
        if (result.item.type === 'chunk') {
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
          score: result.score || 0
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
    
    let contextPrompt = `당신은 토비라이프 블로그의 AI 어시스턴트입니다.\n\n다음은 토비라이프 블로그의 현재 포스트 목록입니다:\n\n`;
    
    searchResults.forEach((result, index) => {
      contextPrompt += `[포스트 ${index + 1}]\n`;
      contextPrompt += `제목: ${result.post.title}\n`;
      contextPrompt += `설명: ${result.post.description}\n`;
      contextPrompt += `태그: ${result.post.tags.join(', ')}\n`;
      
      if (result.relevantChunks.length > 0) {
        contextPrompt += `관련 내용:\n`;
        result.relevantChunks.forEach(chunk => {
          contextPrompt += `${chunk.content.substring(0, 500)}...\n`;
        });
      }
      
      contextPrompt += `\n`;
    });
    
    contextPrompt += `위 블로그 포스트를 기반으로 다음 질문에 답변해주세요:\n${userMessage}\n\n`;
    contextPrompt += `중요: 토비라이프 블로그에는 현재 ${searchResults.length}개의 포스트만 있습니다. 위에 언급된 포스트만 참조하여 답변하고, 없는 포스트는 언급하지 마세요.`;
    
    return contextPrompt;
  }

  /**
   * 참조 링크 포맷
   */
  formatReferences(searchResults) {
    if (searchResults.length === 0) return '';
    
    let references = '\n\n📚 참조한 포스트:\n';
    
    searchResults.forEach(result => {
      const postUrl = `/posts/${result.post.path.replace('.md', '')}`;
      references += `- [${result.post.title}](${postUrl})\n`;
    });
    
    return references;
  }
}

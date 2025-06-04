// Astra DB 캐시 서비스
import AstraDBClient from './astra-db-client.js';

export class CacheService {
  constructor() {
    this.client = new AstraDBClient();
  }

  // 질문 정규화 (대소문자, 공백 등 통일)
  normalizeQuestion(question) {
    return question
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[?!.,;]+$/, ''); // 끝의 구두점 제거
  }

  // 캐시 키 생성 (질문 + 컨텍스트)
  generateCacheKey(question, context = {}) {
    const normalizedQuestion = this.normalizeQuestion(question);
    
    // 컨텍스트가 있으면 포함
    if (context.postId || context.category) {
      const contextKey = JSON.stringify({
        postId: context.postId || null,
        category: context.category || null,
      });
      return `${normalizedQuestion}::${contextKey}`;
    }
    
    return normalizedQuestion;
  }

  // 캐시에서 응답 조회
  async get(question, context = {}) {
    try {
      const normalizedQuestion = this.normalizeQuestion(question);
      const cached = await this.client.getCacheEntry(normalizedQuestion);
      
      if (cached) {
        console.log('캐시 히트:', normalizedQuestion);
        return {
          hit: true,
          answer: cached.response, // 'answer'가 아닌 'response'
          context: {
            complexity: cached.complexity,
            hasSearchResults: cached.has_search,
            responseTime: cached.response_time
          },
          createdAt: cached.created_at,
        };
      }
      
      console.log('캐시 미스:', normalizedQuestion);
      return { hit: false };
    } catch (error) {
      console.error('캐시 조회 실패:', error);
      return { hit: false };
    }
  }

  // 캐시에 응답 저장
  async set(question, answer, context = {}) {
    try {
      const normalizedQuestion = this.normalizeQuestion(question);
      await this.client.setCacheEntry(normalizedQuestion, answer, context);
      console.log('캐시 저장 완료:', normalizedQuestion);
      return true;
    } catch (error) {
      console.error('캐시 저장 실패:', error);
      return false;
    }
  }

  // 유사한 질문 찾기 (선택적 기능)
  async findSimilar(question, threshold = 0.8) {
    // 향후 구현: 벡터 유사도 검색 또는 키워드 매칭
    // 현재는 정확한 매치만 지원
    return null;
  }

  // 캐시 통계 (디버깅용)
  async getStats() {
    try {
      // 실제로는 더 복잡한 쿼리가 필요하지만, 
      // 기본적인 통계를 위한 구조
      return {
        totalEntries: 0, // TODO: COUNT 쿼리 구현
        hitRate: 0, // TODO: 히트율 계산
      };
    } catch (error) {
      console.error('통계 조회 실패:', error);
      return null;
    }
  }
}

// 싱글톤 인스턴스
let cacheInstance;

export function getCacheService() {
  if (!cacheInstance) {
    try {
      // 환경 변수 체크
      if (!process.env.ASTRA_DB_REST_URL || 
          !process.env.ASTRA_DB_APPLICATION_TOKEN || 
          !process.env.ASTRA_DB_KEYSPACE) {
        console.warn('Astra DB environment variables not configured, cache disabled');
        return null;
      }
      cacheInstance = new CacheService();
    } catch (error) {
      console.error('Failed to initialize cache service:', error);
      return null;
    }
  }
  return cacheInstance;
}

export default CacheService;

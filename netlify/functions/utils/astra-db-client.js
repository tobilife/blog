// Astra DB REST API 클라이언트

export class AstraDBClient {
  constructor() {
    this.baseUrl = process.env.ASTRA_DB_REST_URL;
    this.token = process.env.ASTRA_DB_APPLICATION_TOKEN;
    this.keyspace = process.env.ASTRA_DB_KEYSPACE;
    
    if (!this.baseUrl || !this.token || !this.keyspace) {
      console.warn('Astra DB 환경 변수가 설정되지 않았습니다:', {
        hasUrl: !!this.baseUrl,
        hasToken: !!this.token,
        hasKeyspace: !!this.keyspace
      });
      throw new Error('Astra DB configuration missing');
    }
  }

  // 기본 요청 헤더
  getHeaders() {
    return {
      'X-Cassandra-Token': this.token,
      'Content-Type': 'application/json',
    };
  }

  // REST API 요청 메서드
  async request(method, path, body = null) {
    const url = `${this.baseUrl}/api/rest/v2/keyspaces/${this.keyspace}${path}`;
    
    try {
      const options = {
        method,
        headers: this.getHeaders(),
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Astra DB 오류: ${response.status} - ${error}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return null;
    } catch (error) {
      console.error('Astra DB 요청 실패:', error);
      throw error;
    }
  }

  // chat_cache 테이블 조회
  async getCacheEntry(question) {
    // cache_key를 생성 (질문을 정규화하여 키로 사용)
    const cacheKey = this.generateCacheKey(question);
    const path = `/chat_cache/${encodeURIComponent(cacheKey)}`;
    
    try {
      const result = await this.request('GET', path);
      
      if (result && result.data && result.data.length > 0) {
        const entry = result.data[0];
        // 만료 시간 확인
        const expiresAt = new Date(entry.expires_at);
        if (expiresAt > new Date()) {
          return entry;
        }
      }
    } catch (error) {
      // 404는 정상적인 캐시 미스
      if (error.message.includes('404')) {
        return null;
      }
      throw error;
    }
    
    return null;
  }

  // chat_cache 테이블 저장
  async setCacheEntry(question, answer, context = {}) {
    const ttlSeconds = parseInt(process.env.CACHE_TTL_SECONDS || '3600');
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    const cacheKey = this.generateCacheKey(question);
    
    // PRIMARY KEY는 데이터에 포함시키지 않음
    const data = {
      query: question,
      response: answer,
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
      complexity: String(context.complexity || 0), // TEXT 타입이므로 문자열로 변환
      has_search: context.hasSearchResults || false,
      popularity: 1,
      response_time: context.responseTime || 0
    };

    // Primary key를 URL에 포함
    const path = `/chat_cache/${encodeURIComponent(cacheKey)}`;
    return await this.request('PUT', path, data);
  }

  // 캐시 키 생성 함수
  generateCacheKey(question) {
    // 질문을 소문자로 변환하고 공백을 정규화
    return question.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  // async_tasks 테이블 생성
  async createTask(question, status = 'pending') {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // PRIMARY KEY는 데이터에 포함시키지 않음
    const data = {
      query: question,
      status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      progress: 0
    };

    // Primary key를 URL에 포함
    const path = `/async_tasks/${taskId}`;
    await this.request('PUT', path, data);
    
    return taskId;
  }

  // async_tasks 테이블 조회
  async getTask(taskId) {
    const path = `/async_tasks/${taskId}`;
    
    try {
      const result = await this.request('GET', path);
      
      if (result && result.data && result.data.length > 0) {
        return result.data[0];
      }
    } catch (error) {
      // 404는 정상적인 경우 (작업이 없음)
      if (error.message.includes('404')) {
        return null;
      }
      throw error;
    }
    
    return null;
  }

  // async_tasks 테이블 업데이트
  async updateTask(taskId, updates) {
    const path = `/async_tasks/${taskId}`;
    
    // 기존 데이터를 먼저 가져옴
    const existing = await this.getTask(taskId);
    if (!existing) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    // PRIMARY KEY는 제외하고 데이터 병합
    const { task_id, ...existingWithoutPK } = existing;
    const data = {
      ...existingWithoutPK,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    // task_id가 updates에 있다면 제거
    delete data.task_id;
    
    return await this.request('PUT', path, data);
  }

  // 작업 완료 처리
  async completeTask(taskId, answer, error = null) {
    const updates = {
      status: error ? 'failed' : 'completed',
      final_response: error ? null : answer,
      progress: 100
    };
    
    if (error) {
      updates.error_message = error.message;
    }
    
    return await this.updateTask(taskId, updates);
  }
}

export default AstraDBClient;

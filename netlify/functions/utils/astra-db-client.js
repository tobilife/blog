// Astra DB REST API 클라이언트
import fetch from 'node-fetch';

export class AstraDBClient {
  constructor() {
    this.baseUrl = process.env.ASTRA_DB_REST_URL;
    this.token = process.env.ASTRA_DB_APPLICATION_TOKEN;
    this.keyspace = process.env.ASTRA_DB_KEYSPACE;
    
    if (!this.baseUrl || !this.token || !this.keyspace) {
      throw new Error('Astra DB 환경 변수가 설정되지 않았습니다.');
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
    const path = `/chat_cache/rows?question=${encodeURIComponent(question)}`;
    const result = await this.request('GET', path);
    
    if (result && result.data && result.data.length > 0) {
      const entry = result.data[0];
      // 만료 시간 확인
      const expiresAt = new Date(entry.expires_at);
      if (expiresAt > new Date()) {
        return entry;
      }
    }
    
    return null;
  }

  // chat_cache 테이블 저장
  async setCacheEntry(question, answer, context = {}) {
    const ttlSeconds = parseInt(process.env.CACHE_TTL_SECONDS || '3600');
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    
    const data = {
      question,
      answer,
      context,
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
    };

    // REST API v2에서는 /rows 엔드포인트 사용
    const path = '/chat_cache/rows';
    return await this.request('POST', path, data);
  }

  // async_tasks 테이블 생성
  async createTask(question, status = 'pending') {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const data = {
      task_id: taskId,
      question,
      status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // REST API v2에서는 /rows 엔드포인트 사용
    const path = '/async_tasks/rows';
    await this.request('POST', path, data);
    
    return taskId;
  }

  // async_tasks 테이블 조회
  async getTask(taskId) {
    const path = `/async_tasks/rows?task_id=${encodeURIComponent(taskId)}`;
    const result = await this.request('GET', path);
    
    if (result && result.data && result.data.length > 0) {
      return result.data[0];
    }
    
    return null;
  }

  // async_tasks 테이블 업데이트
  async updateTask(taskId, updates) {
    const path = `/async_tasks/${taskId}`;
    const data = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    return await this.request('PATCH', path, data);
  }

  // 작업 완료 처리
  async completeTask(taskId, answer, error = null) {
    const updates = {
      status: error ? 'failed' : 'completed',
      answer: error ? null : answer,
      error: error ? error.message : null,
    };
    
    return await this.updateTask(taskId, updates);
  }
}

export default AstraDBClient;

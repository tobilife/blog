// 비동기 작업 관리 서비스
import AstraDBClient from './astra-db-client.js';

export class AsyncTaskService {
  constructor() {
    this.client = new AstraDBClient();
  }

  // 새 작업 생성
  async createTask(question, metadata = {}) {
    try {
      const taskId = await this.client.createTask(question, 'pending');
      
      console.log('비동기 작업 생성:', taskId);
      
      return {
        taskId,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('작업 생성 실패:', error);
      throw error;
    }
  }

  // 작업 상태 조회
  async getTaskStatus(taskId) {
    try {
      const task = await this.client.getTask(taskId);
      
      if (!task) {
        return {
          found: false,
          error: 'Task not found',
        };
      }

      return {
        found: true,
        taskId: task.task_id,
        status: task.status,
        question: task.question,
        answer: task.answer,
        error: task.error,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
      };
    } catch (error) {
      console.error('작업 조회 실패:', error);
      throw error;
    }
  }

  // 작업 처리 시작
  async startProcessing(taskId) {
    try {
      await this.client.updateTask(taskId, {
        status: 'processing',
      });
      console.log('작업 처리 시작:', taskId);
    } catch (error) {
      console.error('작업 상태 업데이트 실패:', error);
    }
  }

  // 작업 완료
  async completeTask(taskId, answer) {
    try {
      await this.client.completeTask(taskId, answer);
      console.log('작업 완료:', taskId);
    } catch (error) {
      console.error('작업 완료 처리 실패:', error);
      throw error;
    }
  }

  // 작업 실패
  async failTask(taskId, error) {
    try {
      await this.client.completeTask(taskId, null, error);
      console.log('작업 실패 처리:', taskId);
    } catch (error) {
      console.error('작업 실패 처리 오류:', error);
    }
  }

  // 오래된 작업 정리 (선택적)
  async cleanupOldTasks(hoursOld = 24) {
    // TODO: 오래된 작업 삭제 로직
    // 현재는 수동으로 처리
    console.log(`${hoursOld}시간 이상 된 작업 정리 예정`);
  }
}

// 싱글톤 인스턴스
let taskInstance;

export function getAsyncTaskService() {
  if (!taskInstance) {
    taskInstance = new AsyncTaskService();
  }
  return taskInstance;
}

export default AsyncTaskService;

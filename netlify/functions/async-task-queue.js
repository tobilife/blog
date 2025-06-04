// 비동기 작업 큐 처리 함수
import { getCacheService } from './utils/cache-service.js';
import { getAsyncTaskService } from './utils/async-task-service.js';

export const handler = async (event, context) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
    };
  }

  try {
    const { action, taskId, question, answer } = JSON.parse(event.body || '{}');

    const taskService = getAsyncTaskService();

    switch (action) {
      case 'create':
        // 새 작업 생성
        if (!question) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Question is required' }),
          };
        }

        const task = await taskService.createTask(question);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            taskId: task.taskId,
            status: 'pending',
            message: '작업이 생성되었습니다. 잠시 후 상태를 확인해주세요.',
          }),
        };

      case 'status':
        // 작업 상태 조회
        if (!taskId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'TaskId is required' }),
          };
        }

        const status = await taskService.getTaskStatus(taskId);
        if (!status.found) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Task not found' }),
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            ...status,
          }),
        };

      case 'complete':
        // 작업 완료 처리 (내부용)
        if (!taskId || !answer) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'TaskId and answer are required' }),
          };
        }

        await taskService.completeTask(taskId, answer);
        
        // 캐시에도 저장
        const taskData = await taskService.getTaskStatus(taskId);
        if (taskData.found && taskData.question) {
          const cacheService = getCacheService();
          await cacheService.set(taskData.question, answer);
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Task completed successfully',
          }),
        };

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' }),
        };
    }
  } catch (error) {
    console.error('Async task queue error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};

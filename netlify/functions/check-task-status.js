// 작업 상태 확인 전용 함수
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
    // URL 파라미터에서 taskId 추출
    const taskId = event.queryStringParameters?.taskId;

    if (!taskId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'TaskId is required' }),
      };
    }

    const taskService = getAsyncTaskService();
    const status = await taskService.getTaskStatus(taskId);

    if (!status.found) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Task not found' }),
      };
    }

    // 응답 형식화
    const response = {
      taskId: status.taskId,
      status: status.status,
      question: status.question,
      createdAt: status.createdAt,
      updatedAt: status.updatedAt,
    };

    // 완료된 경우 답변 포함
    if (status.status === 'completed' && status.answer) {
      response.answer = status.answer;
    }

    // 실패한 경우 에러 포함
    if (status.status === 'failed' && status.error) {
      response.error = status.error;
    }

    // 진행률 추가 (상태에 따라)
    switch (status.status) {
      case 'pending':
        response.progress = 0;
        response.message = '작업이 대기 중입니다...';
        break;
      case 'processing':
        response.progress = 50;
        response.message = '답변을 생성하고 있습니다...';
        break;
      case 'completed':
        response.progress = 100;
        response.message = '답변이 준비되었습니다!';
        break;
      case 'failed':
        response.progress = 0;
        response.message = '작업 처리 중 오류가 발생했습니다.';
        break;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };

  } catch (error) {
    console.error('Check task status error:', error);
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

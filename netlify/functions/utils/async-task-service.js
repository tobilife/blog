// 비동기 작업 관리 서비스
const AstraDBClient = require("./astra-db-client.js");

class AsyncTaskService {
	constructor() {
		this.client = new AstraDBClient();
	}

	// 새 작업 생성
	async createTask(question, metadata = {}) {
		try {
			const taskId = await this.client.createTask(question, "pending");

			return {
				taskId,
				status: "pending",
				createdAt: new Date().toISOString(),
			};
		} catch (error) {
			console.error("작업 생성 실패:", error);
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
					error: "Task not found",
				};
			}

			return {
				found: true,
				taskId: task.task_id,
				status: task.status,
				question: task.query, // 'question'이 아닌 'query'
				answer: task.final_response, // 'answer'가 아닌 'final_response'
				error: task.error_message, // 에러 메시지 필드
				progress: task.progress || 0,
				createdAt: task.created_at,
				updatedAt: task.updated_at,
			};
		} catch (error) {
			console.error("작업 조회 실패:", error);
			throw error;
		}
	}

	// 작업 처리 시작
	async startProcessing(taskId) {
		try {
			await this.client.updateTask(taskId, {
				status: "processing",
			});
		} catch (error) {
			console.error("작업 상태 업데이트 실패:", error);
		}
	}

	// 작업 완료
	async completeTask(taskId, answer) {
		try {
			await this.client.completeTask(taskId, answer);
		} catch (error) {
			console.error("작업 완료 처리 실패:", error);
			throw error;
		}
	}

	// 작업 실패
	async failTask(taskId, error) {
		try {
			await this.client.completeTask(taskId, null, error);
		} catch (error) {
			console.error("작업 실패 처리 오류:", error);
		}
	}

	// 오래된 작업 정리 (선택적)
	async cleanupOldTasks(hoursOld = 24) {}
}

// 싱글톤 인스턴스
let taskInstance;

function getAsyncTaskService() {
	if (!taskInstance) {
		try {
			// 환경 변수 체크
			if (
				!process.env.ASTRA_DB_REST_URL ||
				!process.env.ASTRA_DB_APPLICATION_TOKEN ||
				!process.env.ASTRA_DB_KEYSPACE
			) {
				console.warn("Astra DB environment variables not configured, async tasks disabled");
				return null;
			}
			taskInstance = new AsyncTaskService();
		} catch (error) {
			console.error("Failed to initialize async task service:", error);
			return null;
		}
	}
	return taskInstance;
}

module.exports = {
	AsyncTaskService,
	getAsyncTaskService,
};

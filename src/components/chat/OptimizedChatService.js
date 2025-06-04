// Optimized Chat Service with Astra DB integration
export class OptimizedChatService {
	constructor() {
		this.LANGFLOW_API_URL = "/api/chat"; // Edge Function 사용 (60초 타임아웃)
		this.CHECK_STATUS_URL = "/.netlify/functions/check-task-status";
		this.pollingIntervals = new Map(); // 진행 중인 폴링 관리
	}

	// 메시지 전송
	async sendMessage(payload) {
		const response = await fetch(this.LANGFLOW_API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		const responseData = await response.json();

		// 202 Accepted - 비동기 처리
		if (response.status === 202) {
			return {
				type: "async",
				taskId: responseData.taskId,
				message: responseData.message,
				estimatedTime: responseData.estimatedTime,
				checkStatusUrl: responseData.checkStatusUrl,
			};
		}

		// 200 OK - 동기 처리 완료
		if (response.status === 200) {
			return {
				type: "sync",
				data: responseData,
				cacheHit: response.headers.get("X-Cache") === "HIT",
				complexity: response.headers.get("X-Query-Complexity"),
				responseTime: response.headers.get("X-Response-Time"),
			};
		}

		// 오류 처리
		throw new Error(responseData.error || "Unknown error occurred");
	}

	// 작업 상태 확인
	async checkTaskStatus(taskId) {
		const response = await fetch(`${this.CHECK_STATUS_URL}?taskId=${taskId}`);
		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.error || "Failed to check task status");
		}

		return data;
	}

	// 폴링으로 작업 완료 대기
	async pollTaskCompletion(taskId, onProgress, onComplete, onError) {
		// 이미 폴링 중인 경우 중복 방지
		if (this.pollingIntervals.has(taskId)) {
			console.warn(`Already polling task ${taskId}`);
			return;
		}

		let attempts = 0;
		const maxAttempts = 60; // 최대 60번 시도 (약 2분)
		const baseInterval = 1000; // 기본 간격 1초
		let currentInterval = baseInterval;

		const poll = async () => {
			try {
				attempts++;
				const status = await this.checkTaskStatus(taskId);

				// 진행 상태 업데이트
				if (onProgress) {
					onProgress({
						status: status.status,
						progress: status.progress || 0,
						message: status.message,
						taskId: taskId,
					});
				}

				// 완료된 경우
				if (status.status === "completed") {
					this.stopPolling(taskId);
					if (onComplete) {
						onComplete({
							answer: status.answer,
							taskId: taskId,
						});
					}
					return;
				}

				// 실패한 경우
				if (status.status === "failed") {
					this.stopPolling(taskId);
					if (onError) {
						onError(new Error(status.error || "Task failed"));
					}
					return;
				}

				// 최대 시도 횟수 초과
				if (attempts >= maxAttempts) {
					this.stopPolling(taskId);
					if (onError) {
						onError(new Error("Task timeout - exceeded maximum attempts"));
					}
					return;
				}

				// 다음 폴링 예약 (지수 백오프)
				currentInterval = Math.min(currentInterval * 1.2, 5000); // 최대 5초
				const timeoutId = setTimeout(poll, currentInterval);
				this.pollingIntervals.set(taskId, timeoutId);
			} catch (error) {
				console.error("Polling error:", error);
				this.stopPolling(taskId);
				if (onError) {
					onError(error);
				}
			}
		};

		// 첫 폴링 시작
		poll();
	}

	// 폴링 중지
	stopPolling(taskId) {
		if (this.pollingIntervals.has(taskId)) {
			clearTimeout(this.pollingIntervals.get(taskId));
			this.pollingIntervals.delete(taskId);
			console.log(`Stopped polling for task ${taskId}`);
		}
	}

	// 모든 폴링 중지
	stopAllPolling() {
		this.pollingIntervals.forEach((timeoutId, taskId) => {
			clearTimeout(timeoutId);
			console.log(`Stopped polling for task ${taskId}`);
		});
		this.pollingIntervals.clear();
	}

	// 응답 파싱 (기존 코드와 호환)
	parseResponse(data) {
		let botResponse = "Sorry, I could not generate a response.";

		if (data.outputs) {
			// outputs 배열 순회
			if (Array.isArray(data.outputs)) {
				for (const output of data.outputs) {
					// 다양한 경로 시도
					if (output.outputs?.[0]?.results?.message?.text) {
						botResponse = output.outputs[0].results.message.text;
						break;
					}
					if (output.outputs?.[0]?.results?.text?.text) {
						botResponse = output.outputs[0].results.text.text;
						break;
					}
					if (output.outputs?.[0]?.results?.text) {
						botResponse = output.outputs[0].results.text;
						break;
					}
					if (output.outputs?.[0]?.message) {
						botResponse = output.outputs[0].message;
						break;
					}
					if (output.message) {
						botResponse = output.message;
						break;
					}
					if (output.text) {
						botResponse = output.text;
						break;
					}
				}
			}
		}

		// 직접 필드 확인
		if (data.result) {
			botResponse = data.result;
		} else if (data.message) {
			botResponse = data.message;
		} else if (data.text) {
			botResponse = data.text;
		}

		// <think> 태그 제거
		if (botResponse.includes("<think>")) {
			botResponse = botResponse.replace(/<think>.*?<\/think>/gs, "").trim();
		}

		return botResponse;
	}

	// 복잡도 기반 메시지 생성
	generateComplexityMessage(complexity) {
		const messages = {
			simple: "빠르게 답변 드리겠습니다! ⚡",
			moderate: "답변을 준비하고 있습니다... 🤔",
			complex:
				"복잡한 질문이네요. 정확한 답변을 위해 잠시만 기다려주세요... 🧠",
		};
		return messages[complexity] || messages.moderate;
	}

	// 진행 상태 메시지 생성
	generateProgressMessage(progress, status) {
		if (status === "pending") {
			return "작업이 대기열에 있습니다... ⏳";
		}
		if (status === "processing") {
			if (progress < 30) return "답변을 생성하기 시작했습니다... 🚀";
			if (progress < 60) return "정보를 분석하고 있습니다... 📊";
			if (progress < 90) return "거의 완료되었습니다... 🎯";
			return "마무리 중입니다... ✨";
		}
		if (status === "completed") {
			return "답변이 준비되었습니다! ✅";
		}
		if (status === "failed") {
			return "오류가 발생했습니다. 다시 시도해주세요. ❌";
		}
		return "처리 중입니다...";
	}
}

export default OptimizedChatService;

const AstraDBClient = require("./utils/astra-db-client.js");

exports.handler = async (event, context) => {
	// CORS 헤더
	const headers = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Headers": "Content-Type",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Content-Type": "application/json",
	};

	// OPTIONS 요청 처리
	if (event.httpMethod === "OPTIONS") {
		return { statusCode: 200, headers, body: "" };
	}

	// POST 요청만 허용
	if (event.httpMethod !== "POST") {
		return {
			statusCode: 405,
			headers,
			body: JSON.stringify({ error: "Method not allowed" }),
		};
	}

	try {
		const { cacheKey, feedback, comment, timestamp } = JSON.parse(event.body);

		if (!cacheKey) {
			return {
				statusCode: 400,
				headers,
				body: JSON.stringify({ error: "Cache key is required" }),
			};
		}

		// Astra DB 클라이언트 초기화
		const astraClient = new AstraDBClient();

		// 현재 캐시 항목 조회 - cacheKey를 직접 사용
		const path = `/chat_cache/${encodeURIComponent(cacheKey)}`;
		let currentEntry = null;

		try {
			const result = await astraClient.request("GET", path);
			if (result?.data && result.data.length > 0) {
				currentEntry = result.data[0];
			}
		} catch (error) {
			if (error.message.includes("404")) {
				return {
					statusCode: 404,
					headers,
					body: JSON.stringify({ error: "Cache entry not found" }),
				};
			}
			throw error;
		}

		if (!currentEntry) {
			return {
				statusCode: 404,
				headers,
				body: JSON.stringify({ error: "Cache entry not found" }),
			};
		}

		let userFeedback = currentEntry.user_feedback || 0;
		let feedbackCount = currentEntry.feedback_count || 0;

		// 피드백 업데이트 로직
		if (feedback !== 0) {
			userFeedback += feedback;
			feedbackCount += 1;
		}

		// 품질 점수 재계산
		const qualityScore = calculateQualityScore(userFeedback, feedbackCount);
		const confidenceLevel = getConfidenceLevel(qualityScore, feedbackCount);

		// 품질 상세 정보 업데이트
		const qualityDetails = JSON.stringify({
			score: qualityScore,
			confidence: confidenceLevel,
			feedback: { positive: 0, negative: 0, total: feedbackCount },
			lastComment: comment,
			lastFeedbackAt: timestamp,
		});

		// 낮은 품질 점수 처리 (자동 삭제)
		if (qualityScore < 30 && feedbackCount >= 5) {
			// 품질이 매우 낮은 경우 캐시에서 삭제
			await astraClient.request("DELETE", path);

			return {
				statusCode: 200,
				headers,
				body: JSON.stringify({
					success: true,
					message: "Low quality entry removed",
					deleted: true,
					qualityScore,
					feedbackCount,
				}),
			};
		}

		// 기존 엔트리 업데이트 (PUT 요청으로 전체 데이터 전송)
		const updatedEntry = {
			...currentEntry,
			user_feedback: userFeedback,
			feedback_count: feedbackCount,
			quality_score: qualityScore,
			confidence_level: confidenceLevel,
			quality_details: qualityDetails,
			last_validated: new Date().toISOString(),
		};

		// cache_key는 URL에 포함되므로 데이터에서 제거
		updatedEntry.cache_key = undefined;

		await astraClient.request("PUT", path, updatedEntry);

		return {
			statusCode: 200,
			headers,
			body: JSON.stringify({
				success: true,
				qualityScore,
				confidenceLevel,
				feedbackCount,
				userFeedback,
			}),
		};
	} catch (error) {
		console.error("Feedback update error:", error);
		return {
			statusCode: 500,
			headers,
			body: JSON.stringify({
				error: "Failed to update feedback",
				details: error.message,
			}),
		};
	}
};

// 품질 점수 계산 함수
function calculateQualityScore(userFeedback, feedbackCount) {
	if (feedbackCount === 0) return 50;

	// 평균 피드백 점수 (-1 ~ 1 범위)
	const avgFeedback = userFeedback / feedbackCount;

	// 0-100 스케일로 변환
	const baseScore = (avgFeedback + 1) * 50;

	// 피드백 수에 따른 신뢰도 가중치
	const confidenceWeight = Math.min(feedbackCount / 10, 1);

	// 최종 점수 (기본값과 실제 점수의 가중 평균)
	return Math.round(baseScore * confidenceWeight + 50 * (1 - confidenceWeight));
}

// 신뢰도 레벨 결정 함수
function getConfidenceLevel(qualityScore, feedbackCount) {
	if (feedbackCount < 3) return "low";
	if (qualityScore >= 80 && feedbackCount >= 10) return "high";
	if (qualityScore >= 60 && feedbackCount >= 5) return "medium";
	return "low";
}

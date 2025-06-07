// Astra DB 캐시 서비스 API
const { getCacheService } = require("./utils/cache-service.js");

exports.handler = async (event, context) => {
	// CORS 헤더
	const headers = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Headers": "Content-Type",
		"Content-Type": "application/json",
	};

	// OPTIONS 요청 처리
	if (event.httpMethod === "OPTIONS") {
		return {
			statusCode: 200,
			headers,
		};
	}

	try {
		const cacheService = getCacheService();

		if (event.httpMethod === "GET") {
			// 캐시 조회
			const question = event.queryStringParameters?.question;

			if (!question) {
				return {
					statusCode: 400,
					headers,
					body: JSON.stringify({ error: "Question parameter is required" }),
				};
			}

			const result = await cacheService.get(question);

			return {
				statusCode: 200,
				headers,
				body: JSON.stringify(result),
			};
		}

		if (event.httpMethod === "POST") {
			// 캐시 저장
			const { question, answer, context } = JSON.parse(event.body || "{}");

			if (!question || !answer) {
				return {
					statusCode: 400,
					headers,
					body: JSON.stringify({ error: "Question and answer are required" }),
				};
			}

			const success = await cacheService.set(question, answer, context);

			return {
				statusCode: 200,
				headers,
				body: JSON.stringify({
					success,
					message: success ? "Cache entry saved" : "Failed to save cache entry",
				}),
			};
		}

		return {
			statusCode: 405,
			headers,
			body: JSON.stringify({ error: "Method not allowed" }),
		};
	} catch (error) {
		console.error("Cache service error:", error);
		return {
			statusCode: 500,
			headers,
			body: JSON.stringify({
				error: "Internal server error",
				message: error.message,
			}),
		};
	}
};

import fetch from "node-fetch";

const CACHE_INVALIDATION_URL = "https://blog.tobimind.com/api/langflow/cache-invalidation";
const CHAT_API_URL = "https://blog.tobimind.com/api/chat";

async function checkCacheStatus() {
	try {
		console.info("\n=== Checking Cache Status ===");

		// 캐시 무효화 실행
		console.info("\n1. Invalidating blog-related cache entries...");
		const invalidationResponse = await fetch(CACHE_INVALIDATION_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
		});

		if (!invalidationResponse.ok) {
			throw new Error(`HTTP error! status: ${invalidationResponse.status}`);
		}

		const invalidationData = await invalidationResponse.json();

		console.info("\nInvalidation Results:");
		console.info(`Success: ${invalidationData.success}`);
		console.info(`Invalidated Count: ${invalidationData.invalidatedCount}`);
		console.info(`Metadata Version: ${invalidationData.metadata?.version || "unknown"}`);
		console.info(`Total Posts: ${invalidationData.metadata?.totalPosts || 0}`);
		console.info(`Last Updated: ${invalidationData.metadata?.lastUpdated || "unknown"}`);

		// 테스트 쿼리 실행
		console.info("\n2. Testing with blog-related query...");
		const testQueries = ["블로그에 어떤 글들이 있나요?", "최신 포스트는 무엇인가요?", "어떤 주제로 글을 쓰셨나요?"];

		for (const query of testQueries) {
			console.info(`\nQuery: "${query}"`);

			const testResponse = await fetch(CHAT_API_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					input_value: query,
					enableWebSearch: false,
				}),
			});

			const headers = testResponse.headers;
			console.info(`Cache Status: ${headers.get("x-cache") || "N/A"}`);
			console.info(`Response Time: ${headers.get("x-response-time") || "N/A"}ms`);

			const data = await testResponse.json();
			if (data.metadataVersion) {
				console.info(`Metadata Version Used: ${data.metadataVersion}`);
			}
		}

		return invalidationData;
	} catch (error) {
		console.error("Error:", error);
		return null;
	}
}

// 실행
checkCacheStatus().then(() => {
	console.info("\n=== Test Complete ===");
});

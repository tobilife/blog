// Astra DB 캐시 무효화 함수
export async function handler(event, context) {
	// CORS 헤더
	const headers = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
	};

	// OPTIONS 요청 처리
	if (event.httpMethod === "OPTIONS") {
		return { statusCode: 200, headers, body: "" };
	}

	// 환경 변수
	const ASTRA_DB_REST_URL = process.env.ASTRA_DB_REST_URL;
	const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN;
	const ASTRA_DB_KEYSPACE = process.env.ASTRA_DB_KEYSPACE;

	if (!ASTRA_DB_REST_URL || !ASTRA_DB_APPLICATION_TOKEN || !ASTRA_DB_KEYSPACE) {
		return {
			statusCode: 500,
			headers,
			body: JSON.stringify({ error: "Cache service not configured" }),
		};
	}

	try {
		// 메타데이터 가져오기
		const metadataResponse = await fetch("https://blog.tobimind.com/posts-metadata.json");
		if (!metadataResponse.ok) {
			throw new Error("Failed to fetch metadata");
		}
		const metadata = await metadataResponse.json();

		// 블로그 관련 키워드 패턴
		const blogPatterns = [
			"블로그",
			"blog",
			"포스트",
			"post",
			"글",
			"게시글",
			"최신글",
			"글목록",
			"글 목록",
			"어떤 글",
			"무슨 글",
			"쓴 글",
			"작성한",
			"article",
			"content",
			"콘텐츠",
			"주제",
			"topic",
		];

		// 캐시된 모든 블로그 관련 질문 찾기 (실제로는 페이징이 필요)
		const searchUrl = `${ASTRA_DB_REST_URL}/api/rest/v2/keyspaces/${ASTRA_DB_KEYSPACE}/chat_cache/rows`;

		const searchResponse = await fetch(searchUrl, {
			method: "GET",
			headers: {
				"X-Cassandra-Token": ASTRA_DB_APPLICATION_TOKEN,
				"Content-Type": "application/json",
			},
		});

		if (!searchResponse.ok) {
			console.error("Failed to search cache entries:", searchResponse.status);
			return {
				statusCode: 200,
				headers,
				body: JSON.stringify({
					success: false,
					message: "Failed to search cache entries",
					metadata: {
						version: metadata.version,
						totalPosts: metadata.totalPosts,
					},
				}),
			};
		}

		const cacheData = await searchResponse.json();
		const entries = cacheData.data || [];

		let invalidatedCount = 0;
		const currentDate = new Date().toISOString();

		// 블로그 관련 캐시 엔트리 무효화
		for (const entry of entries) {
			const query = entry.query || "";
			const lowerQuery = query.toLowerCase();

			// 블로그 관련 질문인지 체크
			const isBlogRelated = blogPatterns.some((pattern) => lowerQuery.includes(pattern));

			if (isBlogRelated) {
				// TTL을 과거로 설정하여 무효화
				const updateUrl = `${ASTRA_DB_REST_URL}/api/rest/v2/keyspaces/${ASTRA_DB_KEYSPACE}/chat_cache/${encodeURIComponent(entry.query)}`;

				const updateData = {
					...entry,
					expires_at: currentDate, // 즉시 만료
					metadata_version: metadata.version,
					invalidated_at: currentDate,
				};

				try {
					const updateResponse = await fetch(updateUrl, {
						method: "PUT",
						headers: {
							"X-Cassandra-Token": ASTRA_DB_APPLICATION_TOKEN,
							"Content-Type": "application/json",
						},
						body: JSON.stringify(updateData),
					});

					if (updateResponse.ok) {
						invalidatedCount++;
						console.info(`Invalidated cache for: ${query}`);
					}
				} catch (error) {
					console.error(`Failed to invalidate cache for: ${query}`, error);
				}
			}
		}

		return {
			statusCode: 200,
			headers,
			body: JSON.stringify({
				success: true,
				invalidatedCount,
				metadata: {
					version: metadata.version,
					totalPosts: metadata.totalPosts,
					lastUpdated: metadata.lastUpdated,
				},
				processedEntries: entries.length,
			}),
		};
	} catch (error) {
		console.error("Cache invalidation error:", error);
		return {
			statusCode: 500,
			headers,
			body: JSON.stringify({ error: error.message }),
		};
	}
}

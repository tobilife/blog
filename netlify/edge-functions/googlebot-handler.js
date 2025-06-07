export default async (request, context) => {
	const url = new URL(request.url);

	// Skip API routes completely
	if (url.pathname.startsWith("/api/")) {
		return context.next();
	}

	const userAgent = request.headers.get("user-agent") || "";
	const isGooglebot = userAgent.toLowerCase().includes("googlebot");

	// Log Googlebot requests for debugging
	if (isGooglebot) {
	}

	// Handle Googlebot requests with special care
	if (isGooglebot && request.method === "GET") {
		try {
			// Let the request through normally
			const response = await context.next();

			// If response is not OK, try to fix it
			if (!response.ok && response.status >= 500) {
				// Return a simple HTML response instead
				return new Response(
					`<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TobiLife - IT 개발자의 기술 블로그</title>
    <meta name="description" content="AI, RAG, Git/GitHub, 보험IT 등 다양한 개발 경험과 지식을 공유하는 기술 블로그">
    <link rel="canonical" href="${request.url}">
</head>
<body>
    <h1>TobiLife 블로그</h1>
    <p>토비라이프 블로그입니다.</p>
    <p>AI,보험IT 등 다양한 개발 경험과 지식을 공유합니다.</p>
    <nav>
        <a href="/">홈</a>
        <a href="/archive/">글 목록</a>
        <a href="/about/">소개</a>
    </nav>
</body>
</html>`,
					{
						status: 200,
						headers: {
							"content-type": "text/html; charset=UTF-8",
							"cache-control": "no-cache, no-store, must-revalidate",
						},
					},
				);
			}

			// Add cache headers for successful responses
			if (response.ok) {
				const newHeaders = new Headers(response.headers);
				newHeaders.set("cache-control", "public, max-age=3600");
				return new Response(response.body, {
					status: response.status,
					statusText: response.statusText,
					headers: newHeaders,
				});
			}

			return response;
		} catch (error) {
			console.error("Error handling Googlebot request:", error);
			// Return a basic response on error
			return new Response("OK", { status: 200 });
		}
	}

	// For non-Googlebot requests, pass through normally
	return context.next();
};

export const config = {
	path: "/*",
};

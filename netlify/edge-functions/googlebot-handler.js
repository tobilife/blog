// Simplified Googlebot handler - focus on stability
export default async (request, context) => {
	const url = new URL(request.url);
	const userAgent = request.headers.get("user-agent") || "";
	const lowerUserAgent = userAgent.toLowerCase();
	
	// Only handle Googlebot and Google Inspection Tool
	const isGoogleBot = lowerUserAgent.includes("googlebot") || 
	                   lowerUserAgent.includes("google-inspectiontool") ||
	                   lowerUserAgent.includes("google-structured-data-testing-tool") ||
	                   lowerUserAgent.includes("google-site-verification");
	
	// Pass through if not Google bot
	if (!isGoogleBot) {
		return context.next();
	}
	
	console.info(`Google bot detected: ${userAgent.substring(0, 100)} for ${url.pathname}`);
	
	try {
		// Get the original response with a timeout
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
		
		const response = await Promise.race([
			context.next(),
			new Promise((_, reject) => 
				setTimeout(() => reject(new Error("Timeout")), 5000)
			)
		]);
		
		clearTimeout(timeoutId);
		
		// If we got a response, enhance it
		if (response && response.status < 500) {
			const headers = new Headers(response.headers);
			headers.set("x-robots-tag", "index, follow");
			headers.set("cache-control", "public, max-age=3600");
			
			return new Response(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers: headers
			});
		}
		
		// If server error, return a simple fallback
		if (!response || response.status >= 500) {
			console.error(`Server error for Googlebot: ${response ? response.status : 'No response'}`);
			return createFallbackResponse(url);
		}
		
		return response;
		
	} catch (error) {
		console.error(`Error handling Googlebot: ${error.message}`);
		// Return a simple fallback on any error
		return createFallbackResponse(url);
	}
};

// Simple fallback response
function createFallbackResponse(url) {
	const isHomePage = url.pathname === "/" || url.pathname === "";
	const isPostPage = url.pathname.startsWith("/posts/");
	
	let title = "TobiLife 블로그";
	let description = "AI, RAG, Git/GitHub, 보험IT 등 다양한 개발 경험과 지식을 공유하는 기술 블로그";
	
	if (isPostPage) {
		const slug = url.pathname.split("/")[2];
		if (slug === "rag-blog-post") {
			title = "30분 만에 만드는 우리 회사 전용 AI 검색 시스템";
			description = "Ollama와 오픈소스 도구를 활용해 완전 무료로 사내 문서 검색 AI 시스템을 구축하는 초보자 가이드";
		}
	}
	
	const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${description}">
<meta name="robots" content="index, follow">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:type" content="${isPostPage ? 'article' : 'website'}">
<meta property="og:url" content="${url.href}">
<link rel="canonical" href="${url.href}">
</head>
<body>
<h1>${title}</h1>
<p>${description}</p>
</body>
</html>`;
	
	return new Response(html, {
		status: 200,
		headers: {
			"content-type": "text/html; charset=UTF-8",
			"x-robots-tag": "index, follow",
			"cache-control": "public, max-age=300"
		}
	});
}

export const config = {
	path: "/*"
};

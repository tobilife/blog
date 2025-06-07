// Fetch posts metadata from the JSON file
async function getPostsMetadata() {
	try {
		const response = await fetch("https://tobilife.netlify.app/posts-metadata.json");
		if (response.ok) {
			return await response.json();
		}
	} catch (error) {
		console.error("Failed to fetch posts metadata:", error);
	}
	return null;
}

export default async (request, context) => {
	const url = new URL(request.url);

	// Skip API routes completely
	if (url.pathname.startsWith("/api/")) {
		return context.next();
	}

	const userAgent = request.headers.get("user-agent") || "";
	
	// Check if it's Facebook crawler
	const isFacebookCrawler = userAgent.toLowerCase().includes("facebookexternalhit") || 
		userAgent.toLowerCase().includes("facebookcatalog") ||
		userAgent.toLowerCase().includes("facebookbot");

	// Log Facebook crawler requests for debugging
	if (isFacebookCrawler) {
		console.log("Facebook crawler detected:", {
			url: request.url,
			userAgent: userAgent,
			method: request.method,
		});
	}

	// Handle Facebook crawler requests with special care
	if (isFacebookCrawler && request.method === "GET") {
		try {
			// Add a timeout for the response
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
			
			try {
				// Clone the request and add timeout signal
				const clonedRequest = new Request(request, {
					signal: controller.signal,
				});
				
				// Get the original response with timeout
				const response = await context.next(clonedRequest);
				clearTimeout(timeoutId);

				// If response is OK, return it with optimized headers
				if (response.ok) {
					const newHeaders = new Headers(response.headers);
					newHeaders.set("cache-control", "public, max-age=3600");
					newHeaders.set("x-robots-tag", "index, follow");
					
					return new Response(response.body, {
						status: response.status,
						statusText: response.statusText,
						headers: newHeaders,
					});
				}
				
				// If response is not OK, fall through to fallback
				console.log("Facebook crawler got error response:", response.status);
			} catch (timeoutError) {
				clearTimeout(timeoutId);
				console.log("Facebook crawler request timed out");
			}
			
			// Extract post information from URL
			const pathParts = url.pathname.split("/").filter(Boolean);
			const isPostPage = url.pathname.startsWith("/posts/");
			const postSlug = isPostPage && pathParts[1] ? pathParts[1] : "";
			
			// Get all posts metadata
			const postsMetadata = await getPostsMetadata();
			const metadata = postsMetadata && postSlug ? postsMetadata[postSlug] : null;
			
			// Create proper title and description
			const pageTitle = metadata?.title || (postSlug
				? postSlug
					.split("-")
					.map(word => word.charAt(0).toUpperCase() + word.slice(1))
					.join(" ")
				: "TobiLife 블로그");
			
			const pageDescription = metadata?.description || 
				"AI, RAG, Git/GitHub, 보험IT 등 다양한 개발 경험과 지식을 공유하는 기술 블로그";
			
			const imageUrl = metadata?.image 
				? `https://tobilife.netlify.app${metadata.image}`
				: "https://tobilife.netlify.app/images/banner.png";
			
			// Return a simple but complete HTML response
			return new Response(
				`<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle}${metadata ? " - TobiLife 블로그" : ""}</title>
    <meta name="description" content="${pageDescription}">
    
    <!-- Open Graph Tags for Facebook -->
    <meta property="og:type" content="${isPostPage ? "article" : "website"}">
    <meta property="og:title" content="${pageTitle}">
    <meta property="og:description" content="${pageDescription}">
    <meta property="og:url" content="${request.url}">
    <meta property="og:site_name" content="TobiLife 블로그">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:locale" content="ko_KR">
    ${metadata ? `
    <meta property="article:published_time" content="${metadata.published}">
    <meta property="article:modified_time" content="${metadata.updated || metadata.published}">
    <meta property="article:section" content="${metadata.category}">
    ${metadata.tags.map(tag => `<meta property="article:tag" content="${tag}">`).join("\n    ")}
    ` : ""}
    
    <!-- Twitter Card Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${pageTitle}">
    <meta name="twitter:description" content="${pageDescription}">
    <meta name="twitter:image" content="${imageUrl}">
    
    <link rel="canonical" href="${request.url}">
</head>
<body>
    <h1>TobiLife 블로그</h1>
    <p>토비라이프의 기술 블로그입니다.</p>
    <p>AI, RAG, Git/GitHub, 보험IT 등 다양한 개발 경험과 지식을 공유합니다.</p>
    ${isPostPage && metadata ? `
    <article>
        <h2>${metadata.title}</h2>
        <p>${metadata.description}</p>
        <div>
            <span>카테고리: ${metadata.category}</span> | 
            <span>태그: ${metadata.tags.join(", ")}</span>
        </div>
    </article>` : ""}
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
						"cache-control": "public, max-age=3600",
						"x-robots-tag": "index, follow",
					},
				},
			);
		} catch (error) {
			console.error("Error handling Facebook crawler request:", error);
			
			// Return a basic but valid response on error
			return new Response(
				`<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta property="og:title" content="TobiLife 블로그">
    <meta property="og:description" content="기술 블로그">
    <meta property="og:url" content="${request.url}">
    <meta property="og:type" content="website">
    <meta property="og:image" content="https://tobilife.netlify.app/images/banner.png">
</head>
<body>
    <h1>TobiLife</h1>
</body>
</html>`,
				{
					status: 200,
					headers: {
						"content-type": "text/html; charset=UTF-8",
					},
				},
			);
		}
	}

	// For non-Facebook crawler requests, pass through normally
	return context.next();
};

export const config = {
	path: "/*",
};

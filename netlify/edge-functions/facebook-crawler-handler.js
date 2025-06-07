// Cache for posts metadata with timestamp
let metadataCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fetch posts metadata from the JSON file with caching
async function getPostsMetadata() {
	const now = Date.now();
	
	// Return cached data if still valid
	if (metadataCache && (now - cacheTimestamp) < CACHE_DURATION) {
		return metadataCache;
	}
	
	try {
		// Add cache buster to ensure fresh data
		const cacheBuster = Math.floor(now / CACHE_DURATION);
		const response = await fetch(`https://tobilife.netlify.app/posts-metadata.json?v=${cacheBuster}`);
		if (response.ok) {
			metadataCache = await response.json();
			cacheTimestamp = now;
			console.log("Posts metadata refreshed for Facebook crawler");
			return metadataCache;
		}
	} catch (error) {
		console.error("Failed to fetch posts metadata:", error);
	}
	
	// Return cached data even if expired, if fetch fails
	return metadataCache;
}

export default async (request, context) => {
	const url = new URL(request.url);
	const startTime = Date.now();

	// Skip API routes completely
	if (url.pathname.startsWith("/api/")) {
		return context.next();
	}

	const userAgent = request.headers.get("user-agent") || "";
	
	// Check if it's Facebook crawler or other social media crawlers
	const isFacebookCrawler = userAgent.toLowerCase().includes("facebookexternalhit") || 
		userAgent.toLowerCase().includes("facebookcatalog") ||
		userAgent.toLowerCase().includes("facebookbot");
	
	const isTwitterBot = userAgent.toLowerCase().includes("twitterbot");
	const isLinkedInBot = userAgent.toLowerCase().includes("linkedinbot");
	const isSlackBot = userAgent.toLowerCase().includes("slackbot");
	const isDiscordBot = userAgent.toLowerCase().includes("discordbot");
	const isTelegramBot = userAgent.toLowerCase().includes("telegrambot");
	
	const isSocialCrawler = isFacebookCrawler || isTwitterBot || isLinkedInBot || 
		isSlackBot || isDiscordBot || isTelegramBot;

	// Log social crawler requests for debugging
	if (isSocialCrawler) {
		console.log("Social crawler detected:", {
			url: request.url,
			userAgent: userAgent,
			method: request.method,
			crawler: {
				facebook: isFacebookCrawler,
				twitter: isTwitterBot,
				linkedin: isLinkedInBot,
				slack: isSlackBot,
				discord: isDiscordBot,
				telegram: isTelegramBot
			},
			timestamp: new Date().toISOString()
		});
	}

	// Handle social crawler requests with special care
	if (isSocialCrawler && request.method === "GET") {
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

				// Log response time
				const responseTime = Date.now() - startTime;
				console.log(`Response time for social crawler: ${responseTime}ms, status: ${response.status}`);

				// If response is OK, return it with optimized headers
				if (response.ok) {
					const newHeaders = new Headers(response.headers);
					newHeaders.set("cache-control", "public, max-age=3600");
					newHeaders.set("x-robots-tag", "index, follow");
					newHeaders.set("x-response-time", `${responseTime}ms`);
					
					return new Response(response.body, {
						status: response.status,
						statusText: response.statusText,
						headers: newHeaders,
					});
				}
				
				// If response is not OK, fall through to fallback
				console.log("Social crawler got error response:", response.status);
			} catch (timeoutError) {
				clearTimeout(timeoutId);
				console.log(`Social crawler request timed out after ${Date.now() - startTime}ms`);
			}
			
			// Extract post information from URL
			const pathParts = url.pathname.split("/").filter(Boolean);
			const isPostPage = url.pathname.startsWith("/posts/");
			const postSlug = isPostPage && pathParts[1] ? pathParts[1] : "";
			
			// Get all posts metadata
			const postsMetadata = await getPostsMetadata();
			const metadata = postsMetadata && postSlug ? postsMetadata[postSlug] : null;
			
			if (postSlug && !metadata) {
				console.warn(`No metadata found for post: ${postSlug}`);
			}
			
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
			
			// Return optimized HTML response for social crawlers
			const responseTime = Date.now() - startTime;
			const html = `<!DOCTYPE html>
<html lang="ko" prefix="og: http://ogp.me/ns#">
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
    <meta property="og:image:secure_url" content="${imageUrl}">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${pageTitle}">
    <meta property="og:locale" content="ko_KR">
    <meta property="og:locale:alternate" content="en_US">
    ${metadata ? `
    <meta property="article:published_time" content="${metadata.published}">
    <meta property="article:modified_time" content="${metadata.updated || metadata.published}">
    <meta property="article:author" content="https://tobilife.netlify.app/about/">
    <meta property="article:section" content="${metadata.category}">
    ${metadata.tags.map(tag => `<meta property="article:tag" content="${tag}">`).join("\n    ")}
    ` : ""}
    
    <!-- Twitter Card Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@tobilife">
    <meta name="twitter:creator" content="@tobilife">
    <meta name="twitter:title" content="${pageTitle}">
    <meta name="twitter:description" content="${pageDescription}">
    <meta name="twitter:image" content="${imageUrl}">
    <meta name="twitter:image:alt" content="${pageTitle}">
    
    <!-- LinkedIn Tags -->
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="627">
    
    <!-- Additional Meta Tags -->
    <meta name="author" content="TobiLife(토비라이프)">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${request.url}">
    
    <!-- Structured Data -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "${isPostPage ? "BlogPosting" : "WebSite"}",
        ${isPostPage && metadata ? `
        "headline": "${metadata.title}",
        "description": "${metadata.description}",
        "image": "${imageUrl}",
        "datePublished": "${metadata.published}",
        "dateModified": "${metadata.updated || metadata.published}",
        "author": {
            "@type": "Person",
            "name": "TobiLife(토비라이프)",
            "url": "https://tobilife.netlify.app"
        },
        ` : `
        "name": "TobiLife 블로그",
        "description": "${pageDescription}",
        `}
        "url": "${request.url}",
        "inLanguage": "ko-KR"
    }
    </script>
    
    <!-- Generated for social crawler in ${responseTime}ms -->
</head>
<body>
    <h1>${pageTitle}</h1>
    <p>${pageDescription}</p>
    ${isPostPage && metadata ? `
    <article>
        <h2>${metadata.title}</h2>
        <p>${metadata.description}</p>
        <div>
            <span>카테고리: ${metadata.category}</span> | 
            <span>태그: ${metadata.tags.join(", ")}</span> | 
            <span>작성일: ${new Date(metadata.published).toLocaleDateString('ko-KR')}</span>
        </div>
        ${metadata.image ? `<img src="${imageUrl}" alt="${metadata.title}">` : ""}
    </article>` : ""}
    <nav>
        <a href="/">홈</a>
        <a href="/archive/">글 목록</a>
        <a href="/about/">소개</a>
    </nav>
</body>
</html>`;

			console.log(`Generated fallback HTML for social crawler in ${responseTime}ms`);
			
			return new Response(html, {
				status: 200,
				headers: {
					"content-type": "text/html; charset=UTF-8",
					"cache-control": "public, max-age=3600",
					"x-robots-tag": "index, follow",
					"x-response-time": `${responseTime}ms`,
					"x-served-by": "edge-function-fallback"
				},
			});
		} catch (error) {
			const errorTime = Date.now() - startTime;
			console.error(`Error handling social crawler request after ${errorTime}ms:`, error);
			
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
    <meta name="twitter:card" content="summary_large_image">
</head>
<body>
    <h1>TobiLife</h1>
</body>
</html>`,
				{
					status: 200,
					headers: {
						"content-type": "text/html; charset=UTF-8",
						"x-error": "fallback-response",
						"x-response-time": `${errorTime}ms`
					},
				},
			);
		}
	}

	// For non-social crawler requests, pass through normally
	return context.next();
};

export const config = {
	path: "/*",
};

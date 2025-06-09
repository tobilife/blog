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
			console.log("Posts metadata refreshed");
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
	
	// Check if it's a social media crawler - these should be handled by social-crawler-handler
	const isSocialCrawler = userAgent.toLowerCase().includes("kakaotalk") || 
	 userAgent.toLowerCase().includes("kakaostory") ||
	 userAgent.toLowerCase().includes("kakao") ||
	 userAgent.toLowerCase().includes("daum") ||
	 userAgent.toLowerCase().includes("facebookexternalhit") ||
	 userAgent.toLowerCase().includes("twitterbot") ||
	 userAgent.toLowerCase().includes("linkedinbot") ||
	 userAgent.toLowerCase().includes("slackbot") ||
	 userAgent.toLowerCase().includes("discordbot") ||
	 userAgent.toLowerCase().includes("telegrambot") ||
	 userAgent.toLowerCase().includes("whatsapp") ||
	 userAgent.toLowerCase().includes("naverbot-scrap");
	
	// If it's a social crawler, let the social-crawler-handler handle it
	if (isSocialCrawler) {
	 return context.next();
	}
	
	const isGooglebot = userAgent.toLowerCase().includes("googlebot");
	
	// Also support other search engine bots including Naver
	const isNaverBot = userAgent.toLowerCase().includes("yeti") || // Naver search bot
	 userAgent.toLowerCase().includes("naverbot") ||
	 userAgent.toLowerCase().includes("daumoa"); // Daum search (now part of Kakao)
	
	const isSearchBot = isGooglebot ||
	 isNaverBot ||
	 userAgent.toLowerCase().includes("bingbot") ||
	 userAgent.toLowerCase().includes("yandexbot") ||
	 userAgent.toLowerCase().includes("duckduckbot") ||
	 userAgent.toLowerCase().includes("slurp"); // Yahoo

	// Log bot requests for debugging
	if (isSearchBot) {
		console.log("Search bot detected:", {
			url: request.url,
			userAgent: userAgent,
			method: request.method,
			isGooglebot: isGooglebot,
			isNaverBot: isNaverBot,
			timestamp: new Date().toISOString()
		});
	}

	// Handle search bot requests with special care
	if (isSearchBot && request.method === "GET") {
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
				console.log(`Response time for ${isGooglebot ? 'Googlebot' : 'search bot'}: ${responseTime}ms, status: ${response.status}`);

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
				console.log(`${isGooglebot ? 'Googlebot' : 'Search bot'} got error response:`, response.status);
			} catch (timeoutError) {
				clearTimeout(timeoutId);
				console.log(`${isGooglebot ? 'Googlebot' : 'Search bot'} request timed out after ${Date.now() - startTime}ms`);
			}
			
			// Extract post information from URL
			const pathParts = url.pathname.split("/").filter(Boolean);
			const isPostPage = url.pathname.startsWith("/posts/");
			const postSlug = isPostPage && pathParts[1] ? pathParts[1] : "";
			
			// Get all posts metadata
			const postsMetadata = await getPostsMetadata();
			const metadata = postsMetadata && postsMetadata.posts && postSlug ? postsMetadata.posts[postSlug] : null;
			
			if (postSlug && !metadata) {
				console.warn(`No metadata found for post: ${postSlug}`);
			}
			
			// Create proper title and description
			const pageTitle = metadata?.title || (postSlug
				? postSlug
					.split("-")
					.map(word => word.charAt(0).toUpperCase() + word.slice(1))
					.join(" ")
				: "TobiLife - IT 개발자의 기술 블로그");
			
			const pageDescription = metadata?.description || 
				"AI, RAG, Git/GitHub, 보험IT 등 다양한 개발 경험과 지식을 공유하는 기술 블로그";
			
			const imageUrl = metadata?.image 
				? `https://tobilife.netlify.app${metadata.image}`
				: "https://tobilife.netlify.app/images/banner.png";
			
			// Generate breadcrumb structured data
			const breadcrumbData = {
				"@context": "https://schema.org",
				"@type": "BreadcrumbList",
				"itemListElement": [
					{
						"@type": "ListItem",
						"position": 1,
						"name": "홈",
						"item": "https://tobilife.netlify.app/"
					}
				]
			};
			
			if (isPostPage && metadata) {
				breadcrumbData.itemListElement.push({
					"@type": "ListItem",
					"position": 2,
					"name": metadata.category,
					"item": `https://tobilife.netlify.app/archive/category/${metadata.category.toLowerCase()}/`
				});
				breadcrumbData.itemListElement.push({
					"@type": "ListItem",
					"position": 3,
					"name": metadata.title,
					"item": request.url
				});
			}
			
			// Generate structured data for Google
			const structuredData = isPostPage && metadata ? {
				"@context": "https://schema.org",
				"@type": "BlogPosting",
				"headline": metadata.title,
				"description": metadata.description,
				"keywords": metadata.tags.join(", "),
				"articleSection": metadata.category,
				"datePublished": metadata.published,
				"dateModified": metadata.updated || metadata.published,
				"author": {
					"@type": "Person",
					"name": "TobiLife(토비라이프)",
					"url": "https://tobilife.netlify.app"
				},
				"publisher": {
					"@type": "Organization",
					"name": "TobiLife 블로그",
					"logo": {
						"@type": "ImageObject",
						"url": "https://tobilife.netlify.app/images/banner.png",
						"width": 600,
						"height": 60
					}
				},
				"image": {
					"@type": "ImageObject",
					"url": imageUrl,
					"width": 1200,
					"height": 630
				},
				"url": request.url,
				"mainEntityOfPage": {
					"@type": "WebPage",
					"@id": request.url
				},
				"inLanguage": "ko-KR"
			} : {
				"@context": "https://schema.org",
				"@type": "WebSite",
				"name": "TobiLife(토비라이프) 블로그",
				"alternateName": "TobiLife Blog",
				"url": "https://tobilife.netlify.app/",
				"description": "TobiLife(토비라이프) 블로그 - IT 개발자의 기술 블로그. AI, 보험IT 등 다양한 개발 경험과 지식을 공유합니다.",
				"inLanguage": "ko-KR",
				"author": {
					"@type": "Person",
					"name": "TobiLife(토비라이프)",
					"url": "https://tobilife.netlify.app/about/"
				},
				"potentialAction": {
					"@type": "SearchAction",
					"target": {
						"@type": "EntryPoint",
						"urlTemplate": "https://tobilife.netlify.app/search?q={search_term_string}"
					},
					"query-input": "required name=search_term_string"
				}
			};
			
			// Generate article list for home page
			const articleList = postsMetadata && postsMetadata.posts && !isPostPage ? Object.entries(postsMetadata.posts)
				.sort((a, b) => new Date(b[1].published) - new Date(a[1].published))
				.slice(0, 10) // Show latest 10 posts
				.map(([slug, post]) => `
				<article itemscope itemtype="https://schema.org/BlogPosting">
					<h2 itemprop="headline"><a href="/posts/${slug}/" itemprop="url">${post.title}</a></h2>
					<p itemprop="description">${post.description}</p>
					<div>
						<span itemprop="articleSection">카테고리: ${post.category}</span> | 
						<span>태그: <span itemprop="keywords">${post.tags.join(", ")}</span></span> | 
						<time itemprop="datePublished" datetime="${post.published}">작성일: ${new Date(post.published).toLocaleDateString('ko-KR')}</time>
					</div>
				</article>
			`).join("\n") : "";
			
			// Generate fallback HTML response
			const responseTime = Date.now() - startTime;
			const html = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle}${metadata ? " - TobiLife 블로그" : ""}</title>
    <meta name="description" content="${pageDescription}">
    <meta name="keywords" content="${metadata?.tags?.join(", ") || "AI, RAG, Git, GitHub, 보험IT, 개발, 프로그래밍, 기술블로그"}">
    <meta name="author" content="TobiLife(토비라이프)">
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
    <meta name="googlebot" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
    
    <!-- Open Graph Tags -->
    <meta property="og:type" content="${isPostPage ? "article" : "website"}">
    <meta property="og:title" content="${pageTitle}">
    <meta property="og:description" content="${pageDescription}">
    <meta property="og:url" content="${request.url}">
    <meta property="og:site_name" content="TobiLife 블로그">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:locale" content="ko_KR">
    
    <!-- Canonical URL -->
    <link rel="canonical" href="${request.url}">
    
    <!-- Structured Data for SEO -->
    <script type="application/ld+json">
    ${JSON.stringify(structuredData, null, 2)}
    </script>
    
    <!-- Breadcrumb Structured Data -->
    <script type="application/ld+json">
    ${JSON.stringify(breadcrumbData, null, 2)}
    </script>
    
    <!-- Generated for bot in ${responseTime}ms -->
</head>
<body>
    <header>
        <h1><a href="/">TobiLife 블로그</a></h1>
        <p>토비라이프의 기술 블로그 - AI, 보험IT 개발자의 경험 공유</p>
    </header>
    
    <nav aria-label="메인 네비게이션">
        <a href="/">홈</a>
        <a href="/archive/">글 목록</a>
        <a href="/about/">소개</a>
    </nav>
    
    <nav aria-label="Breadcrumb">
        <ol>
            <li><a href="/">홈</a></li>
            ${isPostPage && metadata ? `
            <li><a href="/archive/category/${metadata.category.toLowerCase()}/">${metadata.category}</a></li>
            <li>${metadata.title}</li>
            ` : ""}
        </ol>
    </nav>
    
    <main>
        ${isPostPage && metadata ? `
        <article itemscope itemtype="https://schema.org/BlogPosting">
            <h1 itemprop="headline">${metadata.title}</h1>
            <meta itemprop="description" content="${metadata.description}">
            <div>
                <span itemprop="articleSection">카테고리: ${metadata.category}</span> | 
                <span>태그: <span itemprop="keywords">${metadata.tags.join(", ")}</span></span> | 
                <time itemprop="datePublished" datetime="${metadata.published}">작성일: ${new Date(metadata.published).toLocaleDateString('ko-KR')}</time>
                ${metadata.updated ? `| <time itemprop="dateModified" datetime="${metadata.updated}">수정일: ${new Date(metadata.updated).toLocaleDateString('ko-KR')}</time>` : ""}
            </div>
            ${metadata.image ? `<img itemprop="image" src="${imageUrl}" alt="${metadata.title}">` : ""}
            <div itemprop="articleBody">
                <p>${metadata.description}</p>
                <p>이 포스트에서는 ${metadata.title}에 대해 자세히 다룹니다. AI, RAG, Git/GitHub, 보험IT 등 다양한 개발 경험과 지식을 공유하는 기술 블로그 포스트입니다.</p>
            </div>
            <div itemprop="author" itemscope itemtype="https://schema.org/Person">
                <meta itemprop="name" content="TobiLife(토비라이프)">
                <meta itemprop="url" content="https://tobilife.netlify.app">
            </div>
        </article>
        ` : `
        <section>
            <h2>최신 포스트</h2>
            ${articleList || "<p>AI, RAG, Git/GitHub, 보험IT 등 다양한 개발 경험과 지식을 공유합니다.</p>"}
        </section>
        `}
    </main>
    
    <footer>
        <p>© 2024 TobiLife. All rights reserved.</p>
    </footer>
</body>
</html>`;

			console.log(`Generated fallback HTML for ${isGooglebot ? 'Googlebot' : 'search bot'} in ${responseTime}ms`);
			
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
			console.error(`Error handling ${isGooglebot ? 'Googlebot' : 'search bot'} request after ${errorTime}ms:`, error);
			
			// Return a basic response on error
			return new Response(
				`<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>TobiLife 블로그</title>
    <meta name="description" content="기술 블로그">
    <link rel="canonical" href="${request.url}">
</head>
<body>
    <h1>TobiLife</h1>
    <p>기술 블로그</p>
</body>
</html>`,
				{
					status: 200,
					headers: {
						"content-type": "text/html; charset=UTF-8",
						"x-error": "fallback-response",
						"x-response-time": `${errorTime}ms`
					},
				}
			);
		}
	}

	// For non-search bot requests, pass through normally
	return context.next();
};

export const config = {
	path: "/*",
};

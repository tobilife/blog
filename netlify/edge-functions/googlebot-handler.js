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
	const isGooglebot = userAgent.toLowerCase().includes("googlebot");

	// Log Googlebot requests for debugging
	if (isGooglebot) {
		console.log("Googlebot detected:", {
			url: request.url,
			userAgent: userAgent,
			method: request.method,
		});
	}

	// Handle Googlebot requests with special care
	if (isGooglebot && request.method === "GET") {
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
				console.log("Googlebot got error response:", response.status);
			} catch (timeoutError) {
				clearTimeout(timeoutId);
				console.log("Googlebot request timed out");
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
				: "TobiLife - IT 개발자의 기술 블로그");
			
			const pageDescription = metadata?.description || 
				"AI, RAG, Git/GitHub, 보험IT 등 다양한 개발 경험과 지식을 공유하는 기술 블로그";
			
			const imageUrl = metadata?.image 
				? `https://tobilife.netlify.app${metadata.image}`
				: "https://tobilife.netlify.app/images/banner.png";
			
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
						"url": "https://tobilife.netlify.app/images/banner.png"
					}
				},
				"image": imageUrl,
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
				"url": "https://tobilife.netlify.app/",
				"description": "TobiLife(토비라이프) 블로그 - IT 개발자의 기술 블로그. AI, 보험IT 등 다양한 개발 경험과 지식을 공유합니다.",
				"inLanguage": "ko-KR",
				"author": {
					"@type": "Person",
					"name": "TobiLife(토비라이프)"
				}
			};
			
			// Generate article list for home page
			const articleList = postsMetadata && !isPostPage ? Object.entries(postsMetadata).map(([slug, post]) => `
				<article>
					<h2><a href="/posts/${slug}/">${post.title}</a></h2>
					<p>${post.description}</p>
					<div>
						<span>카테고리: ${post.category}</span> | 
						<span>태그: ${post.tags.join(", ")}</span> | 
						<span>작성일: ${post.published}</span>
					</div>
				</article>
			`).join("\n") : "";
			
			// Return a comprehensive HTML response for Googlebot
			return new Response(
				`<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle}${metadata ? " - TobiLife 블로그" : ""}</title>
    <meta name="description" content="${pageDescription}">
    <meta name="keywords" content="${metadata?.tags?.join(", ") || "AI, RAG, Git, GitHub, 보험IT, 개발, 프로그래밍, 기술블로그"}">
    <meta name="author" content="TobiLife(토비라이프)">
    <meta name="robots" content="index, follow">
    <meta name="googlebot" content="index, follow">
    
    <!-- Open Graph Tags -->
    <meta property="og:type" content="${isPostPage ? "article" : "website"}">
    <meta property="og:title" content="${pageTitle}">
    <meta property="og:description" content="${pageDescription}">
    <meta property="og:url" content="${request.url}">
    <meta property="og:site_name" content="TobiLife 블로그">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:locale" content="ko_KR">
    
    <link rel="canonical" href="${request.url}">
    
    <!-- Structured Data for SEO -->
    <script type="application/ld+json">
    ${JSON.stringify(structuredData, null, 2)}
    </script>
</head>
<body>
    <header>
        <h1><a href="/">TobiLife 블로그</a></h1>
        <p>토비라이프의 기술 블로그 - AI, 보험IT 개발자의 경험 공유</p>
    </header>
    
    <nav>
        <a href="/">홈</a>
        <a href="/archive/">글 목록</a>
        <a href="/about/">소개</a>
    </nav>
    
    <main>
        ${isPostPage && metadata ? `
        <article itemscope itemtype="https://schema.org/BlogPosting">
            <h1 itemprop="headline">${metadata.title}</h1>
            <meta itemprop="description" content="${metadata.description}">
            <div>
                <span itemprop="articleSection">카테고리: ${metadata.category}</span> | 
                <span>태그: <span itemprop="keywords">${metadata.tags.join(", ")}</span></span> | 
                <time itemprop="datePublished" datetime="${metadata.published}">작성일: ${metadata.published}</time>
            </div>
            ${metadata.image ? `<img itemprop="image" src="${imageUrl}" alt="${metadata.title}">` : ""}
            <div itemprop="articleBody">
                <p>${metadata.description}</p>
                <p>이 포스트에서는 ${metadata.title}에 대해 자세히 다룹니다. AI, RAG, Git/GitHub, 보험IT 등 다양한 개발 경험과 지식을 공유하는 기술 블로그 포스트입니다.</p>
            </div>
            <div itemprop="author" itemscope itemtype="https://schema.org/Person">
                <meta itemprop="name" content="TobiLife(토비라이프)">
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
			console.error("Error handling Googlebot request:", error);
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
					},
				}
			);
		}
	}

	// For non-Googlebot requests, pass through normally
	return context.next();
};

export const config = {
	path: "/*",
};

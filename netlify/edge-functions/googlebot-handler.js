// Simplified Googlebot handler - focus on stability
// Metadata cache
let metadataCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fetch posts metadata
async function getPostsMetadata() {
	const now = Date.now();
	
	if (metadataCache && now - cacheTimestamp < CACHE_DURATION) {
		return metadataCache;
	}
	
	try {
		const response = await fetch("https://tobilife.netlify.app/posts-metadata.json");
		if (response.ok) {
			const data = await response.json();
			metadataCache = data.posts || {};
			cacheTimestamp = now;
			return metadataCache;
		}
	} catch (error) {
		console.error("Failed to fetch metadata:", error);
	}
	
	return metadataCache || {};
}

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
		
		// If server error, return a dynamic fallback
		if (!response || response.status >= 500) {
			console.error(`Server error for Googlebot: ${response ? response.status : 'No response'}`);
			const metadata = await getPostsMetadata();
			return createDynamicFallbackResponse(url, metadata);
		}
		
		return response;
		
	} catch (error) {
		console.error(`Error handling Googlebot: ${error.message}`);
		// Return a dynamic fallback on any error
		const metadata = await getPostsMetadata();
		return createDynamicFallbackResponse(url, metadata);
	}
};

// Dynamic fallback response
function createDynamicFallbackResponse(url, metadata) {
	const isHomePage = url.pathname === "/" || url.pathname === "";
	const isPostPage = url.pathname.startsWith("/posts/");
	
	let title = "TobiLife 블로그";
	let description = "AI, RAG, Git/GitHub, 보험IT 등 다양한 개발 경험과 지식을 공유하는 기술 블로그";
	let image = "/images/banner.png";
	let keywords = "AI, RAG, Git, GitHub, 보험IT, 개발, 프로그래밍, 기술블로그";
	let postData = null;
	
	if (isPostPage) {
		const pathParts = url.pathname.split("/").filter(Boolean);
		const slug = pathParts[1];
		postData = metadata[slug];
		
		if (postData) {
			title = postData.title;
			description = postData.description;
			image = postData.image || image;
			keywords = postData.tags ? postData.tags.join(", ") : keywords;
		}
	}
	
	const fullImageUrl = `https://tobilife.netlify.app${image}`;
	
	// 구조화된 데이터 생성
	let structuredData = {};
	if (isPostPage && postData) {
		structuredData = {
			"@context": "https://schema.org",
			"@type": "BlogPosting",
			"headline": title,
			"description": description,
			"image": fullImageUrl,
			"datePublished": postData.published || new Date().toISOString(),
			"dateModified": postData.updated || postData.published || new Date().toISOString(),
			"author": {
				"@type": "Person",
				"name": "TobiLife"
			},
			"publisher": {
				"@type": "Organization",
				"name": "TobiLife 블로그",
				"logo": {
					"@type": "ImageObject",
					"url": "https://tobilife.netlify.app/images/logo.png"
				}
			},
			"mainEntityOfPage": {
				"@type": "WebPage",
				"@id": url.href
			}
		};
	} else {
		structuredData = {
			"@context": "https://schema.org",
			"@type": "WebSite",
			"name": "TobiLife 블로그",
			"url": "https://tobilife.netlify.app/",
			"description": description,
			"potentialAction": {
				"@type": "SearchAction",
				"target": {
					"@type": "EntryPoint",
					"urlTemplate": "https://tobilife.netlify.app/search?q={search_term_string}"
				},
				"query-input": "required name=search_term_string"
			}
		};
	}
	
	const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${description}">
<meta name="keywords" content="${keywords}">
<meta name="robots" content="index, follow">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${fullImageUrl}">
<meta property="og:type" content="${isPostPage ? 'article' : 'website'}">
<meta property="og:url" content="${url.href}">
<meta property="og:site_name" content="TobiLife 블로그">
<link rel="canonical" href="${url.href}">
<script type="application/ld+json">
${JSON.stringify(structuredData, null, 2)}
</script>
</head>
<body>
<h1>${title}</h1>
<p>${description}</p>
${isPostPage ? `<p>카테고리: ${postData?.category || 'AI'}</p>` : ''}
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

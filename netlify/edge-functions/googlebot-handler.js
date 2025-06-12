// Simplified Googlebot handler - focus on stability
// Metadata cache
let metadataCache = null;
let siteConfigCache = null;
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

// Fetch site config
async function getSiteConfig() {
	if (siteConfigCache) {
		return siteConfigCache;
	}

	try {
		const response = await fetch("https://tobilife.netlify.app/site-config.json");
		if (response.ok) {
			siteConfigCache = await response.json();
			return siteConfigCache;
		}
	} catch (error) {
		console.error("Failed to fetch site config:", error);
	}

	// Fallback config
	return {
		title: "토비라이프",
		subtitle: "70살까지 꿈꾸고 개발하며 성장하고싶은 개발자입니다.✨",
		description: "70살까지 꿈꾸고 개발하며 성장하고싶은 개발자입니다.✨",
		keywords: ["AI", "RAG", "Git", "GitHub", "보험IT", "개발", "프로그래밍", "기술블로그"],
		defaultImage: "/images/banner.png",
	};
}

export default async (request, context) => {
	const url = new URL(request.url);
	const userAgent = request.headers.get("user-agent") || "";
	const lowerUserAgent = userAgent.toLowerCase();

	// 사이트맵, RSS, robots.txt 파일은 건너뛰기
	if (
		(url.pathname.includes("sitemap") && url.pathname.endsWith(".xml")) ||
		url.pathname === "/rss.xml" ||
		url.pathname === "/robots.txt"
	) {
		return context.next();
	}

	// Only handle Googlebot and Google Inspection Tool
	const isGoogleBot =
		lowerUserAgent.includes("googlebot") ||
		lowerUserAgent.includes("google-inspectiontool") ||
		lowerUserAgent.includes("google-structured-data-testing-tool") ||
		lowerUserAgent.includes("google-site-verification");

	// Pass through if not Google bot
	if (!isGoogleBot) {
		return context.next();
	}

	console.info(`Google bot detected: ${userAgent.substring(0, 100)} for ${url.pathname}`);

	// For Google bots, try to get the actual page first
	try {
		// First, try to get the actual page
		const response = await context.next();

		// If we get a valid response, return it
		if (response?.ok) {
			console.info(`Returning actual page for Googlebot: ${url.pathname}`);
			return response;
		}

		// If the response is not ok, fall back to generated response
		console.warn(`Failed to get actual page for Googlebot (status: ${response?.status}), generating fallback`);
		const [metadata, siteConfig] = await Promise.all([getPostsMetadata(), getSiteConfig()]);
		return createDynamicFallbackResponse(url, metadata, siteConfig);
	} catch (error) {
		console.error(`Error handling Googlebot request: ${error.message}`);

		// Try to generate a fallback response
		try {
			const [metadata, siteConfig] = await Promise.all([getPostsMetadata(), getSiteConfig()]);
			return createDynamicFallbackResponse(url, metadata, siteConfig);
		} catch (fallbackError) {
			console.error(`Error creating fallback response: ${fallbackError.message}`);
			// Return a minimal response on error
			return new Response(
				`<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>토비라이프 블로그</title>
<meta name="description" content="기술 블로그">
</head>
<body>
<h1>토비라이프</h1>
</body>
</html>`,
				{
					status: 200,
					headers: {
						"content-type": "text/html; charset=UTF-8",
						"x-robots-tag": "index, follow",
					},
				},
			);
		}
	}
};

// Dynamic fallback response
function createDynamicFallbackResponse(url, metadata, siteConfig) {
	const _isHomePage = url.pathname === "/" || url.pathname === "";
	const isPostPage = url.pathname.startsWith("/posts/");

	// Use dynamic site config values
	let title = siteConfig.title || "토비라이프";
	let description = siteConfig.description || siteConfig.subtitle;
	let image = siteConfig.defaultImage || "/images/banner.png";
	let keywords = Array.isArray(siteConfig.keywords)
		? siteConfig.keywords.join(", ")
		: "AI, RAG, Git, GitHub, 보험IT, 개발, 프로그래밍, 기술블로그";
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
			headline: title,
			description: description,
			image: fullImageUrl,
			datePublished: postData.published || new Date().toISOString(),
			dateModified: postData.updated || postData.published || new Date().toISOString(),
			author: {
				"@type": "Person",
				name: siteConfig.author || "TobiLife",
			},
			publisher: {
				"@type": "Organization",
				name: `${siteConfig.title} 블로그`,
				logo: {
					"@type": "ImageObject",
					url: "https://tobilife.netlify.app/images/logo.png",
				},
			},
			mainEntityOfPage: {
				"@type": "WebPage",
				"@id": url.href,
			},
		};
	} else {
		structuredData = {
			"@context": "https://schema.org",
			"@type": "WebSite",
			name: `${siteConfig.title} 블로그`,
			url: "https://tobilife.netlify.app/",
			description: description,
			potentialAction: {
				"@type": "SearchAction",
				target: {
					"@type": "EntryPoint",
					urlTemplate: "https://tobilife.netlify.app/search?q={search_term_string}",
				},
				"query-input": "required name=search_term_string",
			},
		};
	}

	const html = `<!DOCTYPE html>
<html lang="${siteConfig.lang || "ko"}">
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
<meta property="og:type" content="${isPostPage ? "article" : "website"}">
<meta property="og:url" content="${url.href}">
<meta property="og:site_name" content="${siteConfig.title} 블로그">
<link rel="canonical" href="${url.href}">
<script type="application/ld+json">
${JSON.stringify(structuredData, null, 2)}
</script>
</head>
<body>
<h1>${title}</h1>
<p>${description}</p>
${
	isPostPage && postData
		? `
<p>카테고리: ${postData.category || "AI"}</p>
<p>태그: ${postData.tags ? postData.tags.join(", ") : ""}</p>
<p>작성일: ${postData.published || ""}</p>
`
		: ""
}
</body>
</html>`;

	return new Response(html, {
		status: 200,
		headers: {
			"content-type": "text/html; charset=UTF-8",
			"x-robots-tag": "index, follow",
			"cache-control": "public, max-age=300",
			"x-served-by": "googlebot-handler",
		},
	});
}

export const config = {
	path: "/*",
};

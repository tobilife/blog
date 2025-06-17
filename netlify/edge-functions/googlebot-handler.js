// Optimized Googlebot handler - improved version
// Metadata cache
let metadataCache = null;
let siteConfigCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fetch posts metadata with timeout
async function getPostsMetadata() {
	const now = Date.now();

	if (metadataCache && now - cacheTimestamp < CACHE_DURATION) {
		return metadataCache;
	}

	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 3000); // 3초 타임아웃

		const response = await fetch("https://tobilife.netlify.app/posts-metadata.json", {
			signal: controller.signal,
		});
		clearTimeout(timeoutId);

		if (response.ok) {
			const data = await response.json();
			metadataCache = data.posts || {};
			cacheTimestamp = now;
			return metadataCache;
		}
	} catch (error) {
		console.error("Failed to fetch metadata:", error.message);
	}

	return metadataCache || {};
}

// Fetch site config with timeout
async function getSiteConfig() {
	if (siteConfigCache) {
		return siteConfigCache;
	}

	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 3000); // 3초 타임아웃

		const response = await fetch("https://tobilife.netlify.app/site-config.json", {
			signal: controller.signal,
		});
		clearTimeout(timeoutId);

		if (response.ok) {
			siteConfigCache = await response.json();
			return siteConfigCache;
		}
	} catch (error) {
		console.error("Failed to fetch site config:", error.message);
	}

	// Fallback config
	return {
		title: "토비라이프",
		subtitle: "70살까지 꿈꾸고 개발하며 성장하고싶은 개발자입니다.✨",
		description: "70살까지 꿈꾸고 개발하며 성장하고싶은 개발자입니다.✨",
		keywords: ["AI", "RAG", "Git", "GitHub", "보험IT", "개발", "프로그래밍", "기술블로그"],
		defaultImage: "/images/banner.png",
		author: "TobiLife",
		lang: "ko",
	};
}

export default async (request, context) => {
	const url = new URL(request.url);
	const userAgent = request.headers.get("user-agent") || "";
	const lowerUserAgent = userAgent.toLowerCase();

	// JSON 파일 요청은 건너뛰기
	if (url.pathname.endsWith(".json")) {
		return context.next();
	}

	// CSS, JS, 이미지 파일들은 반드시 건너뛰기 - 구글봇이 리소스에 접근 가능하도록
	if (
		url.pathname.endsWith(".css") ||
		url.pathname.endsWith(".js") ||
		url.pathname.includes("/_astro/") ||
		url.pathname.includes("/images/") ||
		url.pathname.includes("/fonts/") ||
		url.pathname.endsWith(".woff") ||
		url.pathname.endsWith(".woff2") ||
		url.pathname.endsWith(".png") ||
		url.pathname.endsWith(".jpg") ||
		url.pathname.endsWith(".jpeg") ||
		url.pathname.endsWith(".webp") ||
		url.pathname.endsWith(".gif") ||
		url.pathname.endsWith(".svg")
	) {
		return context.next();
	}

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

	// Google Search Console URL 검사와 일반 구글봇을 구분
	const isGoogleInspection =
		lowerUserAgent.includes("google-inspectiontool") ||
		lowerUserAgent.includes("google-structured-data-testing-tool") ||
		lowerUserAgent.includes("google-site-verification");

	// Google Search Console URL 검사일 경우 실제 페이지를 보여줌
	if (isGoogleInspection) {
		console.info(`Google Inspection Tool detected - serving actual page`);
		return context.next();
	}

	// 일반 Googlebot에 대해서도 HTML 페이지는 실제 페이지를 보여줌
	// 단, 파일 크기가 크거나 동적 콘텐츠가 많은 경우를 위해 fallback 유지
	try {
		// 먼저 실제 페이지를 제공해보고, 실패하면 fallback
		const response = await context.next();

		// 응답이 성공적이면 그대로 반환
		if (response.ok) {
			return response;
		}

		// 오류가 발생하면 fallback response
		console.warn(`Failed to get actual page for Googlebot, using fallback`);
		const [metadata, siteConfig] = await Promise.all([getPostsMetadata(), getSiteConfig()]);
		return createDynamicFallbackResponse(url, metadata, siteConfig);
	} catch (error) {
		console.error(`Error serving page to Googlebot: ${error.message}`);

		// Fallback response
		try {
			const [metadata, siteConfig] = await Promise.all([getPostsMetadata(), getSiteConfig()]);
			return createDynamicFallbackResponse(url, metadata, siteConfig);
		} catch (fallbackError) {
			console.error(`Fallback also failed: ${fallbackError.message}`);
			// Return a minimal but valid response on error
			return new Response(
				`<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>토비라이프 블로그</title>
<meta name="description" content="AI, RAG, Git/GitHub, 보험IT 등 다양한 개발 경험과 지식을 공유하는 기술 블로그">
<meta property="og:title" content="토비라이프 블로그">
<meta property="og:description" content="AI, RAG, Git/GitHub, 보험IT 등 다양한 개발 경험과 지식을 공유하는 기술 블로그">
<meta property="og:image" content="https://tobilife.netlify.app/images/banner.png">
<meta property="og:url" content="${url.href}">
<link rel="canonical" href="${url.href}">
</head>
<body>
<h1>토비라이프</h1>
<p>70살까지 꿈꾸고 개발하며 성장하고싶은 개발자입니다.✨</p>
</body>
</html>`,
				{
					status: 200,
					headers: {
						"content-type": "text/html; charset=UTF-8",
						"x-robots-tag": "index, follow",
						"cache-control": "public, max-age=300",
					},
				},
			);
		}
	}
};

// Dynamic fallback response
function createDynamicFallbackResponse(url, metadata, siteConfig) {
	const isHomePage = url.pathname === "/" || url.pathname === "";
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
			title = `${postData.title} | ${siteConfig.title}`;
			description = postData.description;
			image = postData.image || image;
			keywords = postData.tags ? postData.tags.join(", ") : keywords;
		}
	} else if (isHomePage) {
		title = `${siteConfig.title} - ${siteConfig.subtitle}`;
	}

	const fullImageUrl = image.startsWith("http") ? image : `https://tobilife.netlify.app${image}`;

	// 구조화된 데이터 생성
	let structuredData = {};
	if (isPostPage && postData) {
		structuredData = {
			"@context": "https://schema.org",
			"@type": "BlogPosting",
			headline: postData.title,
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
				name: siteConfig.title,
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
			name: siteConfig.title,
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
<meta property="og:site_name" content="${siteConfig.title}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${fullImageUrl}">
<link rel="canonical" href="${url.href}">
<script type="application/ld+json">
${JSON.stringify(structuredData, null, 2)}
</script>
</head>
<body>
<header>
<h1>${isPostPage && postData ? postData.title : siteConfig.title}</h1>
${isPostPage ? "" : `<p>${siteConfig.subtitle}</p>`}
</header>
<main>
<p>${description}</p>
${
	isPostPage && postData
		? `
<article>
<p><strong>카테고리:</strong> ${postData.category || "AI"}</p>
<p><strong>태그:</strong> ${postData.tags ? postData.tags.join(", ") : ""}</p>
<p><strong>작성일:</strong> ${postData.published || ""}</p>
${postData.updated ? `<p><strong>수정일:</strong> ${postData.updated}</p>` : ""}
</article>
`
		: ""
}
${
	isHomePage
		? `
<nav>
<h2>주요 카테고리</h2>
<ul>
<li><a href="/archive/category/ai/">AI</a></li>
<li><a href="/archive/category/git-github/">Git & GitHub</a></li>
<li><a href="/archive/category/portfolio/">Portfolio</a></li>
</ul>
</nav>
`
		: ""
}
</main>
</body>
</html>`;

	return new Response(html, {
		status: 200,
		headers: {
			"content-type": "text/html; charset=UTF-8",
			"x-robots-tag": "index, follow",
			"cache-control": "public, max-age=300",
			"x-served-by": "googlebot-handler-optimized",
		},
	});
}

export const config = {
	path: "/*",
};

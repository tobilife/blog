// 메타데이터 캐시
let metadataCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5분

// posts-metadata.json 가져오기
async function getPostsMetadata() {
	const now = Date.now();

	// 캐시가 유효하면 반환
	if (metadataCache && now - cacheTimestamp < CACHE_DURATION) {
		console.info("Using cached metadata");
		return metadataCache;
	}

	try {
		console.info("Fetching fresh metadata from /posts-metadata.json");
		const response = await fetch("https://tobilife.netlify.app/posts-metadata.json");
		console.info(`Fetch response status: ${response.status}`);

		if (response.ok) {
			const data = await response.json();
			metadataCache = data.posts || {};
			cacheTimestamp = now;
			console.info("Posts metadata loaded successfully");
			console.info(`Total posts loaded: ${Object.keys(metadataCache).length}`);
			return metadataCache;
		} else {
			console.error(`Failed to fetch metadata: HTTP ${response.status}`);
		}
	} catch (error) {
		console.error("Failed to fetch posts metadata:", error.message);
	}

	// 실패 시 하드코딩된 데이터 반환
	return {
		"rag-blog-post": {
			title: "30분 만에 만드는 우리 회사 전용 AI 검색 시스템 - 무료로 구축하는 RAG 지식베이스",
			description: "Ollama와 오픈소스 도구를 활용해 완전 무료로 사내 문서 검색 AI 시스템을 구축하는 초보자 가이드",
			image: "/images/uploads/img.png",
			category: "AI",
			tags: ["RAG", "LangChain", "Ollama", "ChromaDB", "Python", "AI", "지식베이스"],
			published: "2025-04-13",
		},
		"tobilife-portfolio": {
			title: "보험 IT 15년, 토비라이프의 여정",
			description: "손해보험사 IT 개발자 경력 Overview",
			image: "/images/uploads/preview-tobi-career-mindmap.png",
			category: "Portfolio",
			tags: ["Portfolio", "Insurance-IT", "Java", "Oracle", "xPlatform"],
			published: "2024-01-28",
		},
		"git-github-guide": {
			title: "Git/GitHub 명령어 가이드",
			description:
				"Git과 GitHub를 사용하여 프로젝트를 효율적으로 관리하고 협업하는 데 필요한 핵심 명령어들을 초보자의 눈높이에 맞춰 설명합니다.",
			image: "/images/uploads/github-6980894_640.webp",
			category: "Git&GitHub",
			tags: ["Git", "GitHub", "명령어", "가이드", "초보"],
			published: "2024-02-18",
		},
		"sim-studio-complete-guide": {
			title: "Sim Studio: 코딩 없이 만드는 AI 에이전트 워크플로우",
			description: "Sim Studio로 개발 자동화와 API 연동을 구현하는 초보자도 따라할 수 있는 상세 가이드입니다.",
			image: "/images/uploads/simstudio.png",
			category: "AI",
			tags: ["Sim Studio", "AI Agent", "워크플로우", "자동화", "LLM", "Docker", "Ollama"],
			published: "2025-05-27T10:01:00.000Z",
		},
	};
}

export default async (request, context) => {
	const url = new URL(request.url);
	const userAgent = request.headers.get("user-agent") || "";

	// 모든 User-Agent 로깅 (디버깅 용)
	console.info(`[DEBUG] User-Agent: "${userAgent}" for URL: ${url.pathname}`);

	// API 경로는 건너뛰기
	if (url.pathname.startsWith("/api/")) {
		return context.next();
	}

	// 카카오톡 인앱 브라우저는 제외
	if (userAgent.toLowerCase().includes("inapp")) {
		return context.next();
	}

	// 소셜 미디어 크롤러 감지
	const socialCrawlers = [
		"kakaotalk-scrap",
		"kakaostory",
		"daum",
		"facebookexternalhit",
		"facebookcatalog",
		"twitterbot",
		"linkedinbot",
		"telegrambot",
		"whatsapp",
		"slackbot",
		"discordbot",
	];

	const lowerUserAgent = userAgent.toLowerCase();
	const isSocialCrawler = socialCrawlers.some((crawler) => lowerUserAgent.includes(crawler));

	// 소셜 크롤러가 아니면 원본 페이지로
	if (!isSocialCrawler) {
		return context.next();
	}

	console.info(`Social crawler detected: ${userAgent} for URL: ${url.pathname}`);

	// URL 파싱
	const pathParts = url.pathname.split("/").filter(Boolean);
	const isPostPage = pathParts[0] === "posts" && pathParts.length >= 2;
	const postSlug = isPostPage ? pathParts[1] : null;

	// 포스트 메타데이터 가져오기
	const postsData = await getPostsMetadata();
	const postData = postSlug ? postsData[postSlug] : null;

	// 디버깅 로그
	if (postSlug) {
		console.info(`Post slug: ${postSlug}`);
		console.info(`Post data found: ${postData ? "Yes" : "No"}`);
		if (postData) {
			console.info(`Title: ${postData.title}`);
			console.info(`Image: ${postData.image}`);
		}
	}
	// 기본값 설정
	const siteTitle = "TobiLife 블로그";
	const siteDescription = "AI, RAG, Git/GitHub, 보험IT 등 다양한 개발 경험과 지식을 공유하는 기술 블로그";
	const defaultImage = "https://tobilife.netlify.app/images/banner.png";

	const title = postData?.title || siteTitle;
	const description = postData?.description || siteDescription;
	const imageUrl = postData?.image ? `https://tobilife.netlify.app${postData.image}` : defaultImage;

	// 깔끔한 HTML 생성 (카카오톡이 파싱하기 쉽도록)
	// 카카오톡을 위해 최소한의 HTML만 사용
	let html;

	if (userAgent.toLowerCase().includes("kakaotalk")) {
		html =
			"<!DOCTYPE html>" +
			"<html>" +
			"<head>" +
			'<meta charset="UTF-8">' +
			`<title>${title}</title>` +
			`<meta property="og:title" content="${title}">` +
			`<meta property="og:description" content="${description}">` +
			`<meta property="og:image" content="${imageUrl}">` +
			`<meta property="og:url" content="${url.href}">` +
			"</head>" +
			"<body></body>" +
			"</html>";
	} else {
		// 다른 크롤러들을 위한 상세 HTML
		html = `<!DOCTYPE html>
	  <html lang="ko">
	  <head>
	  <meta charset="UTF-8">
	  <meta name="viewport" content="width=device-width, initial-scale=1.0">
	  <title>${title}</title>
	  <meta name="description" content="${description}">
	  <meta property="og:title" content="${title}">
	  <meta property="og:description" content="${description}">
	  <meta property="og:image" content="${imageUrl}">
	  <meta property="og:image:width" content="1200">
	  <meta property="og:image:height" content="630">
	  <meta property="og:image:alt" content="${title}">
	  <meta property="og:url" content="${url.href}">
	  <meta property="og:type" content="${isPostPage ? "article" : "website"}">
	  <meta property="og:site_name" content="${siteTitle}">
	  <meta property="og:locale" content="ko_KR">
	  <meta name="twitter:card" content="summary_large_image">
	  <meta name="twitter:title" content="${title}">
	  <meta name="twitter:description" content="${description}">
	  <meta name="twitter:image" content="${imageUrl}">${
			postData
				? `
	  <meta property="article:published_time" content="${postData.published}">
	  <meta property="article:author" content="TobiLife">${
			postData.category
				? `
	  <meta property="article:section" content="${postData.category}">`
				: ""
		}${
			postData.tags
				? postData.tags
						.map(
							(tag) => `
	  <meta property="article:tag" content="${tag}">`,
						)
						.join("")
				: ""
		}`
				: ""
		}
	  </head>
	  <body>
	  <h1>${title}</h1>
	  <p>${description}</p>
	  </body>
	  </html>`;
	}

	// 응답 반환
	return new Response(html, {
		status: 200,
		headers: {
			"content-type": "text/html; charset=UTF-8",
			"cache-control": "public, max-age=3600",
			"x-robots-tag": "index, follow",
		},
	});
};

export const config = {
	path: "/*",
};

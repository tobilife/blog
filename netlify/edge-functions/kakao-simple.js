export default async (request, context) => {
	const url = new URL(request.url);
	const userAgent = request.headers.get("user-agent") || "";
	
	// 카카오톡 크롤러 체크
	const isKakaoCrawler = userAgent.toLowerCase().includes("kakaotalk") || 
		userAgent.toLowerCase().includes("kakaostory") ||
		userAgent.toLowerCase().includes("kakao") ||
		userAgent.toLowerCase().includes("daum");
	
	// 카카오톡 크롤러가 아니면 원본 페이지로
	if (!isKakaoCrawler) {
		return context.next();
	}
	
	// 포스트 페이지인지 확인
	const isPostPage = url.pathname.startsWith("/posts/");
	const postSlug = isPostPage ? url.pathname.split("/")[2] : "";
	
	// 간단한 HTML 반환
	const html = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>30분 만에 만드는 우리 회사 전용 AI 검색 시스템</title>
    <meta property="og:type" content="article">
    <meta property="og:url" content="${request.url}">
    <meta property="og:title" content="30분 만에 만드는 우리 회사 전용 AI 검색 시스템">
    <meta property="og:description" content="Ollama와 오픈소스 도구를 활용해 완전 무료로 사내 문서 검색 AI 시스템을 구축하는 초보자 가이드">
    <meta property="og:image" content="https://tobilife.netlify.app/images/uploads/img.png">
    <meta property="og:site_name" content="TobiLife 블로그">
</head>
<body>
    <h1>30분 만에 만드는 우리 회사 전용 AI 검색 시스템</h1>
</body>
</html>`;
	
	return new Response(html, {
		status: 200,
		headers: {
			"content-type": "text/html; charset=UTF-8",
		},
	});
};

export const config = {
	path: "/*",
};

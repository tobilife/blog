/**
 * Sitemap Handler Edge Function
 *
 * sitemap 요청에 대해 올바른 Content-Type을 보장합니다.
 */

export default async (request, context) => {
	const url = new URL(request.url);

	// sitemap 파일인지 확인
	const isSitemapRequest = (
		url.pathname.includes("sitemap") &&
		url.pathname.endsWith(".xml")
	) || url.pathname === "/sitemap.xml";

	// sitemap 요청이 아니면 다음 핸들러로
	if (!isSitemapRequest) {
		return context.next();
	}

	// 원본 응답 가져오기 (정적 파일)
	const response = await context.next();

	// 응답이 없거나 404인 경우 그대로 반환
	if (!response || response.status === 404) {
		return response;
	}

	// 응답 본문 가져오기
	const body = await response.text();

	// XML인지 확인
	const isXML = body.trim().startsWith("<?xml") ||
		body.trim().startsWith("<sitemap") ||
		body.trim().startsWith("<urlset");

	if (isXML) {
		// XML Content-Type으로 응답 반환
		return new Response(body, {
			status: 200,
			headers: {
				"content-type": "application/xml; charset=utf-8",
				"cache-control": "public, max-age=3600"
			}
		});
	}

	// XML이 아닌 경우에도 원본 응답 그대로 반환
	// (이 경우는 정적 파일이 없는 등의 오류 상황)
	return response;
};

export const config = {
	path: "/sitemap*.xml"
};

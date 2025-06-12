/**
 * Sitemap Handler Edge Function
 * 
 * 이 Edge Function은 sitemap 요청을 처리하여 
 * 항상 올바른 Content-Type으로 응답하도록 보장합니다.
 */

export default async (request, context) => {
	const url = new URL(request.url);
	const userAgent = request.headers.get("user-agent") || "";
	
	// sitemap 파일인지 확인
	const isSitemapRequest = (
		url.pathname.includes("sitemap") && 
		url.pathname.endsWith(".xml")
	) || url.pathname === "/sitemap.xml";

	// sitemap 요청이 아니면 다음 핸들러로
	if (!isSitemapRequest) {
		return context.next();
	}

	console.info(`[Sitemap Handler] Request for ${url.pathname} from User-Agent: ${userAgent}`);

	// Google Search Console User-Agent 확인
	const isGoogleSearchConsole = userAgent.toLowerCase().includes("google") || 
		userAgent.toLowerCase().includes("googlebot");
	
	if (isGoogleSearchConsole) {
		console.info(`[Sitemap Handler] Google Search Console detected`);
	}

	// 원본 응답 가져오기
	const response = await context.next();
	
	// 응답이 없거나 404인 경우 그대로 반환
	if (!response || response.status === 404) {
		return response;
	}

	// 응답 본문 가져오기
	const body = await response.text();
	
	// HTML 태그로 시작하는지 확인 (이것이 문제의 원인)
	if (body.trim().toLowerCase().startsWith("<!doctype html") || 
		body.trim().toLowerCase().startsWith("<html")) {
		console.error(`[Sitemap Handler] ERROR: HTML response detected for sitemap request!`);
		console.error(`[Sitemap Handler] First 200 chars: ${body.substring(0, 200)}`);
		
		// 정적 파일에서 직접 sitemap 내용 가져오기 시도
		try {
			// dist 폴더의 실제 파일 경로로 fetch 시도
			const staticResponse = await fetch(`https://tobilife.netlify.app${url.pathname}`);
			if (staticResponse.ok) {
				const staticBody = await staticResponse.text();
				if (staticBody.trim().startsWith("<?xml") || staticBody.trim().startsWith("<sitemap")) {
					console.info(`[Sitemap Handler] Successfully fetched static XML file`);
					return new Response(staticBody, {
						status: 200,
						headers: {
							"content-type": "application/xml; charset=utf-8",
							"cache-control": "public, max-age=3600",
							"x-content-source": "sitemap-handler-static"
						}
					});
				}
			}
		} catch (error) {
			console.error(`[Sitemap Handler] Failed to fetch static file: ${error.message}`);
		}
	}
	
	// XML인지 확인
	const isXML = body.trim().startsWith("<?xml") || 
		body.trim().startsWith("<sitemap") || 
		body.trim().startsWith("<urlset");
	
	if (isXML) {
		// 새로운 헤더로 응답 재생성
		const newHeaders = new Headers(response.headers);
		newHeaders.set("content-type", "application/xml; charset=utf-8");
		newHeaders.set("x-content-type-override", "sitemap-handler");
		
		console.info(`[Sitemap Handler] Returning XML with correct Content-Type`);
		
		return new Response(body, {
			status: response.status,
			statusText: response.statusText,
			headers: newHeaders
		});
	}
	
	// XML이 아닌 경우 에러 로그
	console.error(`[Sitemap Handler] WARNING: Non-XML response for sitemap request`);
	console.error(`[Sitemap Handler] Content preview: ${body.substring(0, 100)}`);
	
	// 강제로 XML Content-Type 설정
	return new Response(body, {
		status: response.status,
		headers: {
			"content-type": "application/xml; charset=utf-8",
			"x-content-warning": "forced-xml-content-type"
		}
	});
};

export const config = {
	path: "/sitemap*.xml"
};

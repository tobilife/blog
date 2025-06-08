export async function GET() {
	const response = await fetch("https://tobilife.netlify.app/sitemap-index.xml");
	const text = await response.text();
	
	// Content-Type을 명시적으로 설정
	return new Response(text, {
		status: 200,
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"X-Robots-Tag": "noindex",
		},
	});
}

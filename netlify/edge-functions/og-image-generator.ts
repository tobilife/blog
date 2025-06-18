export default async (request: Request) => {
	const { searchParams } = new URL(request.url);

	// URL 파라미터에서 정보 가져오기
	const title = searchParams.get("title") || "토비라이프";
	const description = searchParams.get("description") || "70살까지 꿈꾸고 개발하며 성장하고싶은 개발자입니다.✨";
	const type = searchParams.get("type") || "home"; // home, post, archive 등

	// 최신 포스트 정보 가져오기 (홈페이지용)
	let recentPosts: any[] = [];
	if (type === "home") {
		try {
			const response = await fetch("https://tobilife.netlify.app/posts-metadata.json");
			if (response.ok) {
				const data = await response.json();
				const posts = Object.values(data.posts || {}) as any[];
				// 최신 3개 포스트만 가져오기
				recentPosts = posts
					.sort((a: any, b: any) => new Date(b.published).getTime() - new Date(a.published).getTime())
					.slice(0, 3);
			}
		} catch (error) {
			console.error("Failed to fetch posts:", error);
		}
	}

	// SVG 기반 OG 이미지 생성 (1200x630)
	const svg = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
   <rect width="1200" height="630" fill="#0a0a0a"/>
   
   <!-- 메인 컨텐츠 영역 -->
   <g>
    <!-- 헤더 -->
    <text x="60" y="100" font-family="Pretendard, sans-serif" font-size="48" font-weight="700" fill="#ffffff">
     ${title}
    </text>
    <text x="60" y="150" font-family="Pretendard, sans-serif" font-size="24" fill="#a1a1aa">
     ${description}
    </text>
    
    <!-- 푸터 -->
    <circle cx="90" cy="540" r="30" fill="#18181b"/>
    <text x="90" y="545" font-family="Pretendard, sans-serif" font-size="20" fill="#ffffff" text-anchor="middle">토비</text>
    <text x="140" y="545" font-family="Pretendard, sans-serif" font-size="20" fill="#71717a">La vita E Bella</text>
   </g>
   
   <!-- 사이드바 영역 -->
   <rect x="850" y="0" width="350" height="630" fill="#18181b"/>
   
   <!-- 프로필 섹션 -->
   <g>
    <circle cx="1025" cy="100" r="50" fill="#27272a"/>
    <text x="1025" y="110" font-family="Pretendard, sans-serif" font-size="30" fill="#ffffff" text-anchor="middle">토비</text>
    <text x="1025" y="180" font-family="Pretendard, sans-serif" font-size="24" fill="#ffffff" text-anchor="middle">토비라이프</text>
    <line x1="900" y1="220" x2="1150" y2="220" stroke="#27272a" stroke-width="1"/>
   </g>
   
   <!-- 최신 포스트 섹션 (홈페이지일 때만) -->
   ${
			type === "home" && recentPosts.length > 0
				? `
    <text x="900" y="260" font-family="Pretendard, sans-serif" font-size="18" fill="#a1a1aa">최신 포스트</text>
    ${recentPosts
			.map(
				(post, index) => `
     <g>
      <rect x="890" y="${280 + index * 80}" width="320" height="70" rx="8" fill="#27272a"/>
      <text x="910" y="${310 + index * 80}" font-family="Pretendard, sans-serif" font-size="14" fill="#ffffff">
       ${post.title.length > 30 ? post.title.substring(0, 30) + "..." : post.title}
      </text>
      <text x="910" y="${335 + index * 80}" font-family="Pretendard, sans-serif" font-size="12" fill="#71717a">
       ${post.category}
      </text>
     </g>
    `,
			)
			.join("")}
   `
				: ""
		}
   
   <!-- 기술 스택 -->
   <g>
    <text x="900" y="${type === "home" && recentPosts.length > 0 ? "540" : "260"}" font-family="Pretendard, sans-serif" font-size="18" fill="#a1a1aa">Tech Stack</text>
    ${["AI", "RAG", "Git", "GitHub", "보험IT", "TypeScript"]
			.map((tech, index) => {
				const x = 900 + (index % 3) * 100;
				const y = (type === "home" && recentPosts.length > 0 ? 560 : 280) + Math.floor(index / 3) * 35;
				return `
      <rect x="${x}" y="${y}" width="${tech.length * 10 + 20}" height="28" rx="14" fill="#27272a"/>
      <text x="${x + 10 + tech.length * 5}" y="${y + 18}" font-family="Pretendard, sans-serif" font-size="14" fill="#a1a1aa" text-anchor="middle">${tech}</text>
     `;
			})
			.join("")}
   </g>
  </svg>
 `;

	// SVG를 PNG로 변환하기 위한 HTML 응답
	return new Response(svg, {
		status: 200,
		headers: {
			"content-type": "image/svg+xml",
			"cache-control": "public, max-age=3600", // 1시간 캐시
		},
	});
};

export const config = {
	path: "/api/og-image",
};

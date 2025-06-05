/**
 * 블로그 목록 직접 응답 헬퍼
 */

/**
 * 블로그 글 목록을 마크다운 형식으로 생성
 */
export function formatBlogList(posts) {
	if (!posts || posts.length === 0) {
		return "현재 블로그에 등록된 글이 없습니다.";
	}

	let response = "## 토비라이프 블로그 글 목록\n\n";

	// 카테고리별로 그룹화
	const postsByCategory = {};
	for (const post of posts) {
		const category = post.category || "미분류";
		if (!postsByCategory[category]) {
			postsByCategory[category] = [];
		}
		postsByCategory[category].push(post);
	}

	// 카테고리별로 출력
	const sortedCategories = Object.keys(postsByCategory).sort();
	for (const category of sortedCategories) {
		response += `### ${category}\n\n`;

		const sortedPosts = postsByCategory[category].sort(
			(a, b) => new Date(b.published) - new Date(a.published),
		);

		for (const [index, post] of sortedPosts.entries()) {
			// slug가 있으면 slug 사용, 없으면 path에서 .md 제거
			const slug = post.slug || post.path.replace(".md", "");
			const postUrl = `/posts/${slug}/`;
			const date = new Date(post.published).toLocaleDateString("ko-KR");

			response += `${index + 1}. [${post.title}](${postUrl})\n`;
			response += `   - 작성일: ${date}\n`;
			response += `   - ${post.description}\n`;
			if (post.tags && post.tags.length > 0) {
				response += `   - 태그: ${post.tags.slice(0, 5).join(", ")}\n`;
			}
			response += "\n";
		}
	}

	response += "\n더 자세한 내용을 보시려면 각 링크를 클릭해주세요! 😊";
	return response;
}

/**
 * 사용자 질문이 블로그 목록 요청인지 확인
 */
export function isBlogListRequest(query) {
	const listKeywords = [
		"목록",
		"리스트",
		"list",
		"글 목록",
		"포스트 목록",
		"모든 글",
		"전체 글",
		"어떤 글",
	];

	const normalizedQuery = query.toLowerCase();
	return listKeywords.some((keyword) => normalizedQuery.includes(keyword));
}

// 기존 클래스 호환성을 위한 export
export const BlogListHelper = {
	formatBlogList,
	isBlogListRequest,
};

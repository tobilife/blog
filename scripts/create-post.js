import { createClient } from "@sanity/client";

const client = createClient({
	projectId: "85dni07i",
	dataset: "production",
	token: "YOUR_WRITE_TOKEN", // Sanity 대시보드에서 생성
	apiVersion: "2024-01-01",
	useCdn: false,
});

async function createPost() {
	const post = {
		_type: "post",
		title: "나의 첫 블로그 포스트",
		slug: { current: "my-first-post" },
		category: "dev",
		tags: ["블로그", "시작"],
		publishedAt: new Date().toISOString(),
		excerpt: "토비라이프 블로그의 첫 포스트입니다!",
		content: [
			{
				_type: "block",
				children: [
					{
						_type: "span",
						text: "안녕하세요! 토비라이프 블로그에 오신 것을 환영합니다.",
					},
				],
			},
			{
				_type: "block",
				children: [
					{
						_type: "span",
						text: "이 블로그에서는 개발 이야기와 일상을 공유할 예정입니다.",
					},
				],
			},
		],
	};

	try {
		const result = await client.create(post);
	} catch (error) {
		console.error("포스트 생성 실패:", error);
	}
}

createPost();

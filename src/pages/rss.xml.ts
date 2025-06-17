import { siteConfig } from "@/config";
import rss from "@astrojs/rss";
import { getSortedPosts } from "@utils/content-utils";
import type { APIContext } from "astro";
import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";

const parser = new MarkdownIt();

// HTML 태그를 제거하고 텍스트만 추출하는 함수
function stripHtml(html: string): string {
	// 더 강력한 HTML 태그 제거
	return (
		html
			// 먼저 script와 style 태그의 내용까지 제거
			.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
			.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
			// 모든 HTML 태그 제거
			.replace(/<[^>]*>/g, "")
			// HTML 엔티티 디코딩
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&amp;/g, "&")
			.replace(/&quot;/g, '"')
			.replace(/&#039;/g, "'")
			.replace(/&nbsp;/g, " ")
			// 연속된 공백을 하나로
			.replace(/\s+/g, " ")
			// 줄바꿈 정리
			.replace(/\n\s*\n/g, "\n")
			.trim()
	);
}

// 설명을 위한 텍스트 추출 (처음 200자)
function extractDescription(content: string, maxLength = 200): string {
	const text = stripHtml(content);
	return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
}

export async function GET(context: APIContext) {
	const blog = await getSortedPosts();
	const site = context.site ?? "https://tobilife.netlify.app";

	return rss({
		title: siteConfig.title,
		description: siteConfig.subtitle || "No description",
		site: site,
		items: blog.map((post) => {
			const content = typeof post.body === "string" ? post.body : String(post.body || "");
			const htmlContent = parser.render(content);

			// description은 반드시 텍스트만
			const plainTextDescription = post.data.description
				? stripHtml(post.data.description)
				: extractDescription(htmlContent);

			// content:encoded를 위한 HTML (선택사항)
			// RSS 리더가 HTML을 지원하는 경우를 위해
			const cleanHtml = sanitizeHtml(htmlContent, {
				allowedTags: [
					"p",
					"br",
					"strong",
					"em",
					"ul",
					"ol",
					"li",
					"a",
					"code",
					"pre",
					"blockquote",
					"h2",
					"h3",
					"h4",
					"img",
				],
				allowedAttributes: {
					a: ["href", "title"],
					img: ["src", "alt", "width", "height"],
				},
				allowedSchemes: ["http", "https"],
				// 빈 태그 제거
				exclusiveFilter: (frame) => {
					return frame.tag === "p" && !frame.text?.trim();
				},
			});

			// 이미지 URL을 절대 경로로 변환
			const absoluteHtml = cleanHtml.replace(/src="\/([^"]*)"/g, `src="${site}/$1"`);

			return {
				title: post.data.title,
				pubDate: post.data.published,
				// description은 순수 텍스트만
				description: plainTextDescription,
				link: `/posts/${post.slug}/`,
				// content는 content:encoded로 처리됨 (CDATA 래핑은 @astrojs/rss가 자동 처리)
				content: absoluteHtml,
				// 추가 메타데이터
				categories: post.data.tags || (post.data.category ? [post.data.category] : undefined),
				author: siteConfig.title,
				// 이미지가 있으면 enclosure로 추가
				enclosure: post.data.image
					? {
							url: post.data.image.startsWith("http") ? post.data.image : `${site}${post.data.image}`,
							type: "image/jpeg",
							length: 0,
						}
					: undefined,
			};
		}),

		customData: `<language>${siteConfig.lang.split("-")[0]}</language>
<generator>Astro v${process.env.ASTRO_VERSION || "5.0"}</generator>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
<managingEditor>${siteConfig.title}</managingEditor>
<webMaster>${siteConfig.title}</webMaster>
<ttl>60</ttl>
<atom:link href="${site}/rss.xml" rel="self" type="application/rss+xml" />`,

		xmlns: {
			atom: "http://www.w3.org/2005/Atom",
			dc: "http://purl.org/dc/elements/1.1/",
			content: "http://purl.org/rss/1.0/modules/content/",
		},
	});
}

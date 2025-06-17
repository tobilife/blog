import sitemap from "@astrojs/sitemap";
import svelte from "@astrojs/svelte";
import tailwind from "@astrojs/tailwind";
import icon from "astro-icon";
import { defineConfig } from "astro/config";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeComponents from "rehype-components"; /* Render the custom directive content */
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive"; /* Handle directives */
import remarkGithubAdmonitionsToDirectives from "remark-github-admonitions-to-directives";
import remarkMath from "remark-math";
import remarkSectionize from "remark-sectionize";
import { AdmonitionComponent } from "./src/plugins/rehype-component-admonition.mjs";
import { GithubCardComponent } from "./src/plugins/rehype-component-github-card.mjs";
import { parseDirectiveNode } from "./src/plugins/remark-directive-rehype.js";
import { remarkExcerpt } from "./src/plugins/remark-excerpt.js";
import { remarkReadingTime } from "./src/plugins/remark-reading-time.mjs";

// https://astro.build/config
export default defineConfig({
	site: "https://tobilife.netlify.app/",
	base: "/",

	image: {
		service: {
			entrypoint: "astro/assets/services/sharp",
			config: {
				limitInputPixels: false,
			},
		},
		domains: [],
		remotePatterns: [{ protocol: "https" }],
	},
	integrations: [
		tailwind({
			nesting: true,
		}),
		icon({
			include: {
				"fa6-brands": ["*"],
				"fa6-regular": ["*"],
				"fa6-solid": ["*"],
				"material-symbols": ["*"],
			},
		}),
		svelte({
			compilerOptions: {
				// Svelte 5 compatibility mode for mixed Svelte 4/5 components
				compatibility: {
					componentApi: 4,
				},
			},
		}),
		sitemap({
			customPages: [],
			entryLimit: 10000,
			// serialize 함수를 통해 각 페이지의 설정을 동적으로 조정
			serialize: (item) => {
				// URL에 따른 우선순위 설정
				let priority = 0.7; // 기본값
				let changefreq = "weekly"; // 기본값

				// 홈페이지
				if (item.url === "https://tobilife.netlify.app/") {
					priority = 1.0;
					changefreq = "daily";
				}
				// About, Archive 메인 페이지
				else if (item.url.includes("/about/") || item.url.match(/\/archive\/$/)) {
					priority = 0.8;
					changefreq = "weekly";
				}
				// 카테고리, 태그 페이지
				else if (item.url.includes("/archive/category/") || item.url.includes("/archive/tag/")) {
					priority = 0.7;
					changefreq = "weekly";
				}
				// 개별 포스트
				else if (item.url.includes("/posts/")) {
					priority = 0.6;
					changefreq = "monthly";
				}

				return {
					url: item.url,
					lastmod: item.lastmod,
					changefreq: changefreq,
					priority: priority,
				};
			},
		}),
	],
	markdown: {
		remarkPlugins: [
			remarkMath,
			remarkReadingTime,
			remarkExcerpt,
			remarkGithubAdmonitionsToDirectives,
			remarkDirective,
			remarkSectionize,
			parseDirectiveNode,
		],
		rehypePlugins: [
			rehypeKatex,
			rehypeSlug,
			[
				rehypeComponents,
				{
					components: {
						github: GithubCardComponent,
						note: (x, y) => AdmonitionComponent(x, y, "note"),
						tip: (x, y) => AdmonitionComponent(x, y, "tip"),
						important: (x, y) => AdmonitionComponent(x, y, "important"),
						caution: (x, y) => AdmonitionComponent(x, y, "caution"),
						warning: (x, y) => AdmonitionComponent(x, y, "warning"),
					},
				},
			],
			[
				rehypeAutolinkHeadings,
				{
					behavior: "append",
					properties: {
						className: ["anchor"],
					},
					content: {
						type: "element",
						tagName: "span",
						properties: {
							className: ["anchor-icon"],
							"data-pagefind-ignore": true,
						},
						children: [
							{
								type: "text",
								value: "#",
							},
						],
					},
				},
			],
		],
	},
	vite: {
		optimizeDeps: {
			// Pre-bundle heavy dependencies
			include: ["photoswipe", "overlayscrollbars"],
		},
		build: {
			// Optimize for mobile
			target: "es2018",
			rollupOptions: {
				onwarn(warning, warn) {
					if (
						warning.message.includes("is dynamically imported by") &&
						warning.message.includes("but also statically imported by")
					) {
						return;
					}
					warn(warning);
				},
			},
		},
	},
});

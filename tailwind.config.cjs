/** @type {import('tailwindcss').Config} */
const defaultTheme = require("tailwindcss/defaultTheme");
module.exports = {
	content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue,mjs}"],
	darkMode: "class", // allows toggling dark mode manually
	theme: {
		extend: {
			fontFamily: {
				sans: [
					"Pretendard",
					"-apple-system",
					"BlinkMacSystemFont",
					"Apple SD Gothic Neo",
					"Roboto",
					"Noto Sans KR",
					"Segoe UI",
					"Malgun Gothic",
					"Apple Color Emoji",
					"Segoe UI Emoji",
					"Segoe UI Symbol",
					"sans-serif",
				],
				mono: ["JetBrains Mono", "D2Coding", "Consolas", "Monaco", "Menlo", "monospace"],
			},
		},
	},
	plugins: [require("@tailwindcss/typography")],
};

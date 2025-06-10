import { writeFileSync } from "node:fs";

// Since we can't import TypeScript files directly in Node.js,
// we'll create the config data manually
const siteConfigData = {
	title: "토비라이프",
	subtitle: "70살까지 꿈꾸고 개발하며 성장하고싶은 개발자입니다.✨",
	description: "70살까지 꿈꾸고 개발하며 성장하고싶은 개발자입니다.✨",
	lang: "ko",
	author: "토비라이프",
	keywords: ["AI", "RAG", "Git", "GitHub", "보험IT", "개발", "프로그래밍", "기술블로그", "TobiLife", "토비라이프"],
	defaultImage: "/images/banner.png"
};

// Write to public directory
writeFileSync("./public/site-config.json", JSON.stringify(siteConfigData, null, 2));
console.info("Site config generated: ./public/site-config.json");

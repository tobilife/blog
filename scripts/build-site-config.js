import { writeFileSync, readFileSync } from "node:fs";

// Read posts metadata to get all tags and categories
let allTags = [];
let allCategories = [];
try {
 const metadataPath = "./public/posts-metadata.json";
 const metadataContent = readFileSync(metadataPath, "utf-8");
 const metadata = JSON.parse(metadataContent);
 
 // Extract all unique tags and categories from posts
 const tagSet = new Set();
 const categorySet = new Set();
 
 if (metadata.posts) {
  Object.values(metadata.posts).forEach(post => {
   if (post.tags && Array.isArray(post.tags)) {
    post.tags.forEach(tag => tagSet.add(tag));
   }
   if (post.category) {
    categorySet.add(post.category);
   }
  });
 }
 
 // Convert to array
 allTags = Array.from(tagSet);
 allCategories = Array.from(categorySet);
 console.info(`Found ${allTags.length} unique tags and ${allCategories.length} categories from posts`);
} catch (error) {
 console.warn("Could not read posts metadata, using default tags", error.message);
 allTags = ["AI", "RAG", "Git", "GitHub", "보험IT", "개발", "프로그래밍", "기술블로그"];
 allCategories = ["AI", "Git&GitHub", "Portfolio"];
}

// Add essential keywords that might not be in tags
const essentialKeywords = ["TobiLife", "토비라이프", "기술블로그", "개발자블로그"];
const combinedKeywords = [...new Set([...allCategories, ...allTags, ...essentialKeywords])];

// Since we can't import TypeScript files directly in Node.js,
// we'll create the config data manually
const siteConfigData = {
 title: "토비라이프",
 subtitle: "70살까지 꿈꾸고 개발하며 성장하고싶은 개발자입니다.✨",
 description: "70살까지 꿈꾸고 개발하며 성장하고싶은 개발자입니다.✨",
 lang: "ko",
 author: "토비라이프",
 keywords: combinedKeywords,
 defaultImage: "/images/banner.png"
};

// Write to public directory
writeFileSync("./public/site-config.json", JSON.stringify(siteConfigData, null, 2));
console.info("Site config generated: ./public/site-config.json");
console.info(`Total keywords: ${combinedKeywords.length}`);


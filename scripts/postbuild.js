import { copyFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const distPath = "./dist";
const publicPath = "./public";

// Copy robots.txt from public to dist
const robotsSrc = join(publicPath, "robots.txt");
const robotsDest = join(distPath, "robots.txt");

if (existsSync(robotsSrc)) {
 copyFileSync(robotsSrc, robotsDest);
} else {
}

// Copy posts-metadata.json from public to dist
const metadataSrc = join(publicPath, "posts-metadata.json");
const metadataDest = join(distPath, "posts-metadata.json");

if (existsSync(metadataSrc)) {
 copyFileSync(metadataSrc, metadataDest);
 console.log("Copied posts-metadata.json to dist");
} else {
 console.log("posts-metadata.json not found in public directory");
}

// Check if sitemap files exist
const sitemapFiles = ["sitemap-index.xml", "sitemap-0.xml", "robots.txt"];

for (const file of sitemapFiles) {
	const filePath = join(distPath, file);
	if (existsSync(filePath)) {
	} else {
	}
}
const files = readdirSync(distPath);
for (const file of files) {
	if (file.includes("sitemap") || file === "robots.txt") {
	}
}

import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const distPath = "./dist";
const publicPath = "./public";
const srcPath = "./src";

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
	console.info("Copied posts-metadata.json to dist");
} else {
	console.info("posts-metadata.json not found in public directory");
}

// Copy Service Worker files
const swSourceDir = join(publicPath, "sw");
const swDestDir = join(distPath, "sw");

if (existsSync(swSourceDir)) {
	// Create sw directory in dist if it doesn't exist
	if (!existsSync(swDestDir)) {
		mkdirSync(swDestDir, { recursive: true });
	}

	// Copy service-worker.js
	const swSrc = join(swSourceDir, "service-worker.js");
	const swDest = join(swDestDir, "service-worker.js");
	if (existsSync(swSrc)) {
		copyFileSync(swSrc, swDest);
		console.info("Copied service-worker.js to dist/sw");
	}
}

// Copy optimized scripts
const scriptsSourceDir = join(srcPath, "scripts/optimized");
const scriptsDestDir = join(distPath, "scripts/optimized");

if (existsSync(scriptsSourceDir)) {
	// Create scripts/optimized directory in dist if it doesn't exist
	if (!existsSync(scriptsDestDir)) {
		mkdirSync(scriptsDestDir, { recursive: true });
	}

	// Copy all files from optimized scripts
	const scriptFiles = readdirSync(scriptsSourceDir);
	for (const file of scriptFiles) {
		if (file.endsWith(".js")) {
			const srcFile = join(scriptsSourceDir, file);
			const destFile = join(scriptsDestDir, file);
			copyFileSync(srcFile, destFile);
			console.info(`Copied ${file} to dist/scripts/optimized`);
		}
	}
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

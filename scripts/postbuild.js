import { copyFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

console.log("Running postbuild checks...");

const distPath = "./dist";
const publicPath = "./public";

// Copy robots.txt from public to dist
const robotsSrc = join(publicPath, "robots.txt");
const robotsDest = join(distPath, "robots.txt");

if (existsSync(robotsSrc)) {
 copyFileSync(robotsSrc, robotsDest);
 console.log("✓ Copied robots.txt to dist folder");
} else {
 console.log("✗ robots.txt not found in public folder");
}

// Check if sitemap files exist
const sitemapFiles = ["sitemap-index.xml", "sitemap-0.xml", "robots.txt"];

for (const file of sitemapFiles) {
 const filePath = join(distPath, file);
 if (existsSync(filePath)) {
  console.log(`✓ ${file} found in dist folder`);
 } else {
  console.log(`✗ ${file} NOT found in dist folder`);
 }
}

// List all files in dist root
console.log("\nFiles in dist root:");
const files = readdirSync(distPath);
for (const file of files) {
 if (file.includes("sitemap") || file === "robots.txt") {
  console.log(`  - ${file}`);
 }
}

console.log("Postbuild check complete.");

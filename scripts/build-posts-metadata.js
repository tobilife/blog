import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const postsDir = "./src/content/posts";
const outputPath = "./public/posts-metadata.json";

// Function to extract frontmatter from markdown
function extractFrontmatter(content) {
	const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
	const match = content.match(frontmatterRegex);
	if (match) {
		try {
			// Simple YAML parser for frontmatter
			const lines = match[1].split("\n");
			const data = {};
			let currentKey = null;
			let currentArray = null;
			
			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed) continue;
				
				// Handle array items
				if (trimmed.startsWith("- ")) {
					if (currentKey && currentArray) {
						currentArray.push(trimmed.substring(2).trim());
					}
					continue;
				}
				
				// Handle key-value pairs
				const colonIndex = line.indexOf(":");
				if (colonIndex > 0) {
					const key = line.substring(0, colonIndex).trim();
					const value = line.substring(colonIndex + 1).trim();
					
					if (!value) {
						// Start of array
						currentKey = key;
						currentArray = [];
						data[key] = currentArray;
					} else {
						// Simple value
						currentKey = null;
						currentArray = null;
						// Remove quotes if present
						data[key] = value.replace(/^["']|["']$/g, "");
					}
				}
			}
			
			return data;
		} catch (error) {
			console.error("Error parsing frontmatter:", error);
			return null;
		}
	}
	return null;
}

// Read all markdown files and extract metadata
const metadata = {};
const files = readdirSync(postsDir);

for (const file of files) {
	if (file.endsWith(".md")) {
		const filePath = join(postsDir, file);
		const content = readFileSync(filePath, "utf-8");
		const frontmatter = extractFrontmatter(content);
		
		if (frontmatter && frontmatter.draft !== "true") {
			const slug = frontmatter.slug || file.replace(".md", "");
			metadata[slug] = {
				title: frontmatter.title || "",
				description: frontmatter.description || "",
				category: frontmatter.category || "",
				tags: frontmatter.tags || [],
				image: frontmatter.image || null,
				published: frontmatter.published || null,
				updated: frontmatter.updated || null,
			};
		}
	}
}

// Write metadata to JSON file
writeFileSync(outputPath, JSON.stringify(metadata, null, 2));
console.log(`Posts metadata generated: ${outputPath}`);
console.log(`Total posts: ${Object.keys(metadata).length}`);

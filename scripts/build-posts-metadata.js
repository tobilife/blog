import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
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

					if (value) {
						// Simple value
						currentKey = null;
						currentArray = null;
						// Remove quotes if present
						data[key] = value.replace(/^["']|["']$/g, "");
					} else {
						// Start of array
						currentKey = key;
						currentArray = [];
						data[key] = currentArray;
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

// Validate metadata
function validateMetadata(metadata, filename) {
	const errors = [];

	if (!metadata.title) {
		errors.push(`Missing title in ${filename}`);
	}

	if (!metadata.description) {
		errors.push(`Missing description in ${filename}`);
	}

	if (!metadata.category) {
		errors.push(`Missing category in ${filename}`);
	}

	if (!metadata.published) {
		errors.push(`Missing published date in ${filename}`);
	}

	if (metadata.image && !metadata.image.startsWith("/")) {
		errors.push(`Image path should start with "/" in ${filename}`);
	}

	// Check if image file exists
	if (metadata.image) {
		const imagePath = join("./public", metadata.image);
		if (!existsSync(imagePath)) {
			console.warn(`Warning: Image file not found: ${imagePath} (referenced in ${filename})`);
		}
	}

	return errors;
}

// Read all markdown files and extract metadata
const metadata = {};
const allErrors = [];
const files = readdirSync(postsDir);
let totalPosts = 0;
let draftPosts = 0;

console.info("Building posts metadata...");

for (const file of files) {
	if (file.endsWith(".md")) {
		const filePath = join(postsDir, file);
		const content = readFileSync(filePath, "utf-8");
		const frontmatter = extractFrontmatter(content);

		if (frontmatter) {
			if (frontmatter.draft === "true") {
				draftPosts++;
				console.info(`Skipping draft: ${file}`);
				continue;
			}

			const slug = frontmatter.slug || file.replace(".md", "");
			const postMetadata = {
				title: frontmatter.title || "",
				description: frontmatter.description || "",
				category: frontmatter.category || "",
				tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
				image: frontmatter.image || null,
				published: frontmatter.published || null,
				updated: frontmatter.updated || null,
			};

			// Validate metadata
			const errors = validateMetadata(postMetadata, file);
			if (errors.length > 0) {
				allErrors.push(...errors);
			}

			metadata[slug] = postMetadata;
			totalPosts++;

			// Log summary for each post
			console.info(`✓ ${slug}: "${postMetadata.title}" (${postMetadata.tags.length} tags)`);
		} else {
			console.error(`Failed to parse frontmatter in ${file}`);
		}
	}
}

// Generate version hash based on all metadata
const metadataString = JSON.stringify(metadata);
const versionHash = createHash("sha256").update(metadataString).digest("hex").substring(0, 12);

// Add version info to metadata
const metadataWithVersion = {
	version: versionHash,
	lastUpdated: new Date().toISOString(),
	totalPosts: totalPosts,
	posts: metadata,
};

// Write metadata to JSON file
writeFileSync(outputPath, JSON.stringify(metadataWithVersion, null, 2));

// Print summary
console.info("\n=== Build Summary ===");
console.info(`Total posts processed: ${totalPosts}`);
console.info(`Draft posts skipped: ${draftPosts}`);
console.info(`Metadata file: ${outputPath}`);
console.info(`Version hash: ${versionHash}`);

// Print validation errors if any
if (allErrors.length > 0) {
	console.info("\n=== Validation Errors ===");
	for (const error of allErrors) {
		console.error(`❌ ${error}`);
	}
} else {
	console.info("\n✅ All posts validated successfully!");
}

// Print post statistics
console.info("\n=== Post Statistics ===");
const categories = {};
const allTags = {};

for (const post of Object.values(metadata)) {
	// Count categories
	if (post.category) {
		categories[post.category] = (categories[post.category] || 0) + 1;
	}

	// Count tags
	if (Array.isArray(post.tags)) {
		for (const tag of post.tags) {
			allTags[tag] = (allTags[tag] || 0) + 1;
		}
	}
}

console.info("\nCategories:");
const sortedCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]);
for (const [cat, count] of sortedCategories) {
	console.info(`  - ${cat}: ${count} posts`);
}

console.info("\nTop Tags:");
const topTags = Object.entries(allTags)
	.sort((a, b) => b[1] - a[1])
	.slice(0, 10);
for (const [tag, count] of topTags) {
	console.info(`  - ${tag}: ${count} posts`);
}

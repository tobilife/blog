import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const distPath = "./dist";
const metadataPath = "./public/posts-metadata.json";

// Generate additional sitemap entries based on posts metadata
function generateDynamicSitemap() {
	try {
		const metadata = JSON.parse(readFileSync(metadataPath, "utf-8"));
		const sitemapEntries = [];
		const baseUrl = "https://tobilife.netlify.app";
		
		// Add post entries
		Object.entries(metadata).forEach(([slug, post]) => {
			sitemapEntries.push({
				url: `${baseUrl}/posts/${slug}/`,
				lastmod: post.updated || post.published,
				changefreq: "monthly",
				priority: 0.8
			});
		});
		
		// Add category pages
		const categories = [...new Set(Object.values(metadata).map(post => post.category))];
		categories.forEach(category => {
			sitemapEntries.push({
				url: `${baseUrl}/archive/category/${category.toLowerCase()}/`,
				changefreq: "weekly",
				priority: 0.7
			});
		});
		
		// Add tag pages
		const allTags = [...new Set(Object.values(metadata).flatMap(post => post.tags))];
		allTags.forEach(tag => {
			sitemapEntries.push({
				url: `${baseUrl}/archive/tag/${tag.toLowerCase().replace(/\s+/g, "-")}/`,
				changefreq: "weekly",
				priority: 0.6
			});
		});
		
		// Generate sitemap XML
		const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.map(entry => `  <url>
    <loc>${entry.url}</loc>
    ${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ""}
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`).join("\n")}
</urlset>`;
		
		// Write dynamic sitemap
		const dynamicSitemapPath = join(distPath, "sitemap-dynamic.xml");
		writeFileSync(dynamicSitemapPath, sitemap);
		console.log(`Dynamic sitemap generated: ${dynamicSitemapPath}`);
		console.log(`Total URLs: ${sitemapEntries.length}`);
		
		return true;
	} catch (error) {
		console.error("Error generating dynamic sitemap:", error);
		return false;
	}
}

// Generate the dynamic sitemap
generateDynamicSitemap();

// Generate assets manifest for Service Worker
// This script runs during build to create a manifest of static assets

import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function findFiles(dir, pattern) {
	const files = [];

	async function walk(currentDir) {
		const entries = await fs.readdir(currentDir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(currentDir, entry.name);

			if (entry.isDirectory()) {
				// Skip node_modules and hidden directories
				if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
					await walk(fullPath);
				}
			} else if (entry.isFile() && pattern.test(entry.name)) {
				files.push(fullPath);
			}
		}
	}

	await walk(dir);
	return files;
}

async function generateAssetsManifest() {
	console.info("Generating assets manifest for Service Worker...");

	const distPath = path.join(process.cwd(), "dist");
	const manifestPath = path.join(distPath, "sw", "assets-manifest.json");

	try {
		// Find all CSS and JS files in dist
		const cssFiles = await findFiles(distPath, /\.css$/);
		const jsFiles = await findFiles(distPath, /\.js$/);

		// Convert to relative paths
		const manifest = {
			version: new Date().toISOString(),
			css: cssFiles
				.map((file) => {
					const relativePath = path.relative(distPath, file);
					return `/${relativePath.replace(/\\/g, "/")}`;
				})
				.filter((file) => !file.includes("sw/")),
			js: jsFiles
				.map((file) => {
					const relativePath = path.relative(distPath, file);
					return `/${relativePath.replace(/\\/g, "/")}`;
				})
				.filter((file) => !file.includes("sw/") && !file.includes("service-worker")),
			// Add critical assets
			critical: ["/", "/about/", "/archive/", "/offline/", "/manifest.json"],
		};

		// Ensure sw directory exists
		await fs.mkdir(path.dirname(manifestPath), { recursive: true });

		// Write manifest
		await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

		console.info(`Assets manifest generated: ${manifestPath}`);
		console.info(`- CSS files: ${manifest.css.length}`);
		console.info(`- JS files: ${manifest.js.length}`);
	} catch (error) {
		console.error("Error generating assets manifest:", error);
		process.exit(1);
	}
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	generateAssetsManifest();
}

export { generateAssetsManifest };

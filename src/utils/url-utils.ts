import i18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";

export function pathsEqual(path1: string, path2: string): boolean {
	const normalizedPath1 = path1.replace(/^\/|\/$/g, "").toLowerCase();
	const normalizedPath2 = path2.replace(/^\/|\/$/g, "").toLowerCase();
	return normalizedPath1 === normalizedPath2;
}

function joinUrl(...parts: string[]): string {
	// Filter out empty parts and trim each part
	const cleanParts = parts
		.filter((part) => part !== undefined && part !== null)
		.map((part) => part.toString().trim())
		.filter((part) => part !== "");

	// Join parts and clean up multiple slashes
	let joined = cleanParts.join("/");

	// Replace multiple slashes with single slash, but preserve protocol (https://)
	joined = joined.replace(/([^:]\/)\/+/g, "$1");

	// Ensure single leading slash if the path should be absolute
	if (joined.length > 0 && !joined.startsWith("http") && !joined.startsWith("/")) {
		joined = `/${joined}`;
	}

	// Ensure trailing slash is handled correctly
	if (joined.length > 1 && joined.endsWith("//")) {
		joined = joined.slice(0, -1);
	}

	return joined;
}

export function getPostUrlBySlug(slug: string): string {
	return url(`/posts/${slug}/`);
}
export function getTagUrl(tag: string): string {
	if (!tag || !tag.trim()) {
		return url("/archive/tag/");
	}

	// Use encodeURIComponent for URL encoding
	const encodedTag = encodeURIComponent(tag.trim());
	const tagUrl = `/archive/tag/${encodedTag}/`;
	return url(tagUrl);
}

export function getCategoryUrl(category: string): string {
	if (!category || !category.trim()) {
		return url("/archive/category/");
	}

	const trimmedCategory = category.trim();
	if (trimmedCategory === i18n(i18nKey.uncategorized)) {
		return url("/archive/category/uncategorized/");
	}

	// Use encodeURIComponent for URL encoding
	return url(`/archive/category/${encodeURIComponent(trimmedCategory)}/`);
}

export function getDir(path: string): string {
	const lastSlashIndex = path.lastIndexOf("/");
	if (lastSlashIndex < 0) {
		return "/";
	}
	return path.substring(0, lastSlashIndex + 1);
}

export function url(path: string): string {
	// BASE_URL이 빈 문자열이거나 "/"일 때를 처리
	const baseUrl = import.meta.env.BASE_URL || "/";

	// 이미 절대 경로인 경우 그대로 반환
	if (path.startsWith("/")) {
		return path;
	}

	return joinUrl(baseUrl, path);
}

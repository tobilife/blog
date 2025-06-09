import i18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { encodePathSegment } from "./encoding-utils";

export function pathsEqual(path1: string, path2: string) {
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
  joined = "/" + joined;
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
	if (!tag || !tag.trim()) return url("/archive/tag/");

	// use common encoding function
	const encodedTag = encodePathSegment(tag.trim());
	const tagUrl = `/archive/tag/${encodedTag}/`;
	return url(tagUrl);
}

export function getCategoryUrl(category: string): string {
	if (!category || !category.trim()) return url("/archive/category/");

	const trimmedCategory = category.trim();
	if (trimmedCategory === i18n(i18nKey.uncategorized))
		return url("/archive/category/uncategorized/");

	// encodeURIComponent를 사용하여 &와 같은 특수문자를 안전하게 인코딩
	return url(`/archive/category/${encodeURIComponent(trimmedCategory)}/`);
}

export function getDir(path: string): string {
	const lastSlashIndex = path.lastIndexOf("/");
	if (lastSlashIndex < 0) {
		return "/";
	}
	return path.substring(0, lastSlashIndex + 1);
}

export function url(path: string) {
 // BASE_URL이 빈 문자열이거나 "/"일 때를 처리
 const baseUrl = import.meta.env.BASE_URL || "/";
 return joinUrl(baseUrl, path);
}

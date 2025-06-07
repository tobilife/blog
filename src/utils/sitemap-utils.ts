import type { CollectionEntry } from "astro:content";

interface SitemapPage {
	url: string;
	lastmod?: Date;
	changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
	priority?: number;
}

/**
 * URL에서 특수문자를 하이픈으로 변환
 */
export function sanitizeUrlSegment(segment: string): string {
	return segment
		.toLowerCase()
		.replace(/[&]/g, "-and-")
		.replace(/[^a-z0-9가-힣-]/g, "-")
		.replace(/-+/g, "-")
		.trim()
		.replace(/^-|-$/g, "");
}

/**
 * 페이지 타입에 따른 우선순위 반환
 */
export function getPriorityByPageType(url: string): number {
	// 홈페이지
	if (url.endsWith("/") && !url.includes("/archive/") && !url.includes("/posts/")) {
		return 1.0;
	}
	
	// About, Archive 메인 페이지
	if (url.includes("/about/") || url.match(/\/archive\/$/)) {
		return 0.8;
	}
	
	// 카테고리, 태그 페이지
	if (url.includes("/archive/category/") || url.includes("/archive/tag/")) {
		return 0.7;
	}
	
	// 개별 포스트
	if (url.includes("/posts/")) {
		return 0.6;
	}
	
	// 기타 페이지
	return 0.5;
}

/**
 * 페이지 타입에 따른 changefreq 반환
 */
export function getChangefreqByPageType(url: string): SitemapPage["changefreq"] {
	// 홈페이지
	if (url.endsWith("/") && !url.includes("/archive/") && !url.includes("/posts/")) {
		return "daily";
	}
	
	// About, Archive 메인 페이지
	if (url.includes("/about/") || url.match(/\/archive\/$/)) {
		return "weekly";
	}
	
	// 카테고리, 태그 페이지
	if (url.includes("/archive/category/") || url.includes("/archive/tag/")) {
		return "weekly";
	}
	
	// 개별 포스트
	if (url.includes("/posts/")) {
		return "monthly";
	}
	
	// 기타 페이지
	return "monthly";
}

/**
 * 포스트의 마지막 수정일 가져오기
 */
export function getPostLastmod(post: CollectionEntry<"posts">): Date {
	// updated 필드가 있으면 사용, 없으면 published 날짜 사용
	const updated = (post.data as any).updated;
	const published = post.data.published;
	
	if (updated) {
		return new Date(updated);
	}
	
	if (published) {
		return new Date(published);
	}
	
	// 둘 다 없으면 현재 날짜
	return new Date();
}

/**
 * 사이트맵 설정 생성
 */
export function generateSitemapConfig(posts: CollectionEntry<"posts">[]): {
	customPages: SitemapPage[];
	serialize: (item: any) => any;
} {
	// 포스트별 마지막 수정일 매핑
	const postLastmodMap = new Map<string, Date>();
	posts.forEach(post => {
		const url = `/posts/${post.slug}/`;
		postLastmodMap.set(url, getPostLastmod(post));
	});
	
	// 카테고리별 최신 날짜
	const categoryLastmodMap = new Map<string, Date>();
	posts.forEach(post => {
		const category = sanitizeUrlSegment(post.data.category);
		const categoryUrl = `/archive/category/${category}/`;
		const postDate = getPostLastmod(post);
		
		if (!categoryLastmodMap.has(categoryUrl) || categoryLastmodMap.get(categoryUrl)! < postDate) {
			categoryLastmodMap.set(categoryUrl, postDate);
		}
	});
	
	// 태그별 최신 날짜
	const tagLastmodMap = new Map<string, Date>();
	posts.forEach(post => {
		if (post.data.tags) {
			post.data.tags.forEach(tag => {
				const sanitizedTag = sanitizeUrlSegment(tag);
				const tagUrl = `/archive/tag/${sanitizedTag}/`;
				const postDate = getPostLastmod(post);
				
				if (!tagLastmodMap.has(tagUrl) || tagLastmodMap.get(tagUrl)! < postDate) {
					tagLastmodMap.set(tagUrl, postDate);
				}
			});
		}
	});
	
	return {
		customPages: [],
		serialize: (item: any) => {
			const url = item.url;
			
			// 마지막 수정일 결정
			let lastmod = new Date();
			if (postLastmodMap.has(url)) {
				lastmod = postLastmodMap.get(url)!;
			} else if (categoryLastmodMap.has(url)) {
				lastmod = categoryLastmodMap.get(url)!;
			} else if (tagLastmodMap.has(url)) {
				lastmod = tagLastmodMap.get(url)!;
			}
			
			return {
				url: item.url,
				lastmod: lastmod,
				changefreq: getChangefreqByPageType(item.url),
				priority: getPriorityByPageType(item.url),
			};
		}
	};
}

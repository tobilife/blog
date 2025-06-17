// Service Worker for Blog - Network Optimization Strategy
// Version: 1.0.1 - Skip font files

const CACHE_VERSION = "v1.0.1";
const CACHE_NAMES = {
	STATIC: `static-${CACHE_VERSION}`,
	DYNAMIC: `dynamic-${CACHE_VERSION}`,
	IMAGES: `images-${CACHE_VERSION}`,
	POSTS: `posts-${CACHE_VERSION}`,
};

// Resources to cache immediately - only essential files
const STATIC_ASSETS = ["/", "/about/", "/archive/"];

// Resource priorities
const RESOURCE_PRIORITY = {
	HIGH: ["document", "style"],
	MEDIUM: ["script", "manifest"],
	LOW: ["image", "media"],
};

// Cache strategies
const CACHE_STRATEGIES = {
	CACHE_FIRST: "cache-first",
	NETWORK_FIRST: "network-first",
	STALE_WHILE_REVALIDATE: "stale-while-revalidate",
};

// Mobile detection
const isMobile = () => {
	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(self.navigator.userAgent);
};

// Install event - cache static assets
self.addEventListener("install", (event) => {
	console.info("[SW] Installing Service Worker");

	event.waitUntil(
		caches.open(CACHE_NAMES.STATIC).then(async (cache) => {
			// Cache static assets individually with error handling
			const cachePromises = STATIC_ASSETS.map(async (url) => {
				try {
					const response = await fetch(url);
					if (response.ok) {
						await cache.put(url, response);
						console.info("[SW] Cached:", url);
					} else {
						console.warn("[SW] Failed to fetch:", url, response.status);
					}
				} catch (error) {
					console.warn("[SW] Error caching:", url, error.message);
				}
			});

			await Promise.all(cachePromises);
			console.info("[SW] Static assets cached");
		}),
	);

	// Force activation
	self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener("activate", (event) => {
	console.info("[SW] Activating Service Worker");

	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames.map((cacheName) => {
					if (!Object.values(CACHE_NAMES).includes(cacheName)) {
						console.info("[SW] Deleting old cache:", cacheName);
						return caches.delete(cacheName);
					}
				}),
			);
		}),
	);

	// Take control of all clients
	self.clients.claim();
});

// Fetch strategies
class FetchStrategies {
	// Cache first, fallback to network
	static async cacheFirst(request, cacheName) {
		const cache = await caches.open(cacheName);
		const cached = await cache.match(request);

		if (cached) {
			// Update cache in background for next time
			this.updateCache(request, cache);
			return cached;
		}

		try {
			const response = await fetch(request);
			if (response.ok) {
				cache.put(request, response.clone());
			}
			return response;
		} catch (error) {
			console.error("[SW] Network request failed:", error);
			// Return offline page if available
			const offlineResponse = await cache.match("/offline/");
			if (offlineResponse) {
				return offlineResponse;
			}
			throw error;
		}
	}

	// Network first, fallback to cache
	static async networkFirst(request, cacheName) {
		const cache = await caches.open(cacheName);

		try {
			const response = await fetch(request);
			if (response.ok) {
				cache.put(request, response.clone());
			}
			return response;
		} catch (error) {
			const cached = await cache.match(request);
			if (cached) return cached;
			throw error;
		}
	}

	// Serve from cache, update in background
	static async staleWhileRevalidate(request, cacheName) {
		const cache = await caches.open(cacheName);
		const cached = await cache.match(request);

		const fetchPromise = fetch(request)
			.then((response) => {
				if (response.ok) {
					cache.put(request, response.clone());
				}
				return response;
			})
			.catch((error) => {
				console.error("[SW] Background update failed:", error);
				return cached || new Response("Network error", { status: 503 });
			});

		return cached || fetchPromise;
	}

	// Update cache in background
	static async updateCache(request, cache) {
		try {
			const response = await fetch(request);
			if (response.ok) {
				cache.put(request, response.clone());
			}
		} catch (error) {
			// Silent fail - we already served from cache
		}
	}
}

// Request handler
class RequestHandler {
	constructor(request) {
		this.request = request;
		this.url = new URL(request.url);
		this.isPost = this.url.pathname.startsWith("/posts/");
		this.isAsset = this.isAssetRequest();
		this.isMobileClient = isMobile();
	}

	isAssetRequest() {
		// Exclude font files from asset handling
		const assetExtensions = /\.(js|css|jpg|jpeg|png|gif|svg|webp)$/i;
		return assetExtensions.test(this.url.pathname);
	}

	getResourceType() {
		const destination = this.request.destination;
		if (RESOURCE_PRIORITY.HIGH.includes(destination)) return "high";
		if (RESOURCE_PRIORITY.MEDIUM.includes(destination)) return "medium";
		return "low";
	}

	async handle() {
		// Skip font files completely - bypass service worker
		if (/\.(woff2?|ttf|eot|otf)$/i.test(this.url.pathname)) {
			return fetch(this.request);
		}

		// Skip @fontsource files - bypass service worker
		if (this.url.pathname.includes("@fontsource")) {
			return fetch(this.request);
		}

		// Handle different resource types
		if (this.isPost) {
			return this.handlePost();
		} else if (this.isAsset) {
			return this.handleAsset();
		} else if (this.request.destination === "document") {
			return this.handleDocument();
		}

		// Default strategy
		return FetchStrategies.staleWhileRevalidate(this.request, CACHE_NAMES.DYNAMIC);
	}

	async handlePost() {
		// Posts use network-first for freshness
		if (this.isMobileClient) {
			// On mobile, prefer cache for faster loads
			return FetchStrategies.staleWhileRevalidate(this.request, CACHE_NAMES.POSTS);
		}
		return FetchStrategies.networkFirst(this.request, CACHE_NAMES.POSTS);
	}

	async handleAsset() {
		const isImage = /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(this.url.pathname);

		if (isImage) {
			// Images always cache-first
			return FetchStrategies.cacheFirst(this.request, CACHE_NAMES.IMAGES);
		}

		// CSS/JS use stale-while-revalidate
		return FetchStrategies.staleWhileRevalidate(this.request, CACHE_NAMES.STATIC);
	}

	async handleDocument() {
		// HTML pages - network first for freshness
		if (this.isMobileClient && !navigator.onLine) {
			// Offline mobile - try cache first
			return FetchStrategies.cacheFirst(this.request, CACHE_NAMES.DYNAMIC);
		}
		return FetchStrategies.networkFirst(this.request, CACHE_NAMES.DYNAMIC);
	}
}

// Fetch event handler
self.addEventListener("fetch", (event) => {
	// Skip non-GET requests
	if (event.request.method !== "GET") return;

	// Skip external requests
	const url = new URL(event.request.url);
	if (url.origin !== location.origin) return;

	// Skip admin/API routes
	if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin/")) return;

	// Skip @fontsource requests and node_modules
	if (url.pathname.includes("@fontsource") || url.pathname.includes("node_modules")) return;

	// Skip font files
	if (/\.(woff2?|ttf|eot|otf)$/i.test(url.pathname)) return;

	const handler = new RequestHandler(event.request);
	event.respondWith(
		handler.handle().catch((error) => {
			console.error("[SW] Fetch failed:", error);

			// Return offline page if available
			if (event.request.destination === "document") {
				return caches.match("/offline/").then((response) => {
					return (
						response ||
						new Response("Offline", {
							status: 503,
							headers: { "Content-Type": "text/plain" },
						})
					);
				});
			}

			return new Response("Network error", {
				status: 503,
				headers: { "Content-Type": "text/plain" },
			});
		}),
	);
});

// Message handler for cache management
self.addEventListener("message", (event) => {
	if (event.data.type === "SKIP_WAITING") {
		self.skipWaiting();
	} else if (event.data.type === "CACHE_URLS") {
		// Cache specific URLs (for prefetching)
		const urls = event.data.urls || [];
		caches.open(CACHE_NAMES.DYNAMIC).then((cache) => {
			urls.forEach(async (url) => {
				try {
					const response = await fetch(url);
					if (response.ok) {
						cache.put(url, response);
					}
				} catch (error) {
					console.error("[SW] Failed to cache URL:", url, error);
				}
			});
		});
	} else if (event.data.type === "CLEAR_CACHE") {
		// Clear specific cache or all caches
		const cacheName = event.data.cacheName;
		if (cacheName) {
			caches.delete(cacheName);
		} else {
			caches.keys().then((names) => {
				names.forEach((name) => caches.delete(name));
			});
		}
	}
});

// Background sync for offline actions
self.addEventListener("sync", (event) => {
	if (event.tag === "sync-posts") {
		event.waitUntil(syncPosts());
	}
});

async function syncPosts() {
	// Implement background sync for posts if needed
	console.info("[SW] Syncing posts in background");
}

// Periodic background sync (if supported)
self.addEventListener("periodicsync", (event) => {
	if (event.tag === "update-posts") {
		event.waitUntil(updatePostsCache());
	}
});

async function updatePostsCache() {
	const cache = await caches.open(CACHE_NAMES.POSTS);
	const requests = await cache.keys();

	// Update cached posts
	for (const request of requests) {
		try {
			const response = await fetch(request);
			if (response.ok) {
				cache.put(request, response);
			}
		} catch (error) {
			// Continue with next request
		}
	}
}

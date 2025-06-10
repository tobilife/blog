// Swup and Service Worker Integration
// Optimizes network requests and caching for better mobile performance

(() => {
	function integrateSwupWithSW() {
		if (!window.swup || !window.swManager) {
			console.warn("[SW Integration] Swup or SW Manager not available");
			return;
		}

		// Configuration
		const config = {
			prefetchDelay: 100,
			maxPrefetchQueue: 5,
			priorityPatterns: {
				high: ["/posts/", "/about/", "/archive/"],
				medium: ["/_astro/", "/fonts/"],
				low: ["/images/", "/assets/"],
			},
		};

		// Prefetch queue management
		const prefetchQueue = new Map();
		let isProcessing = false;

		// Determine resource priority
		function getResourcePriority(url) {
			for (const [priority, patterns] of Object.entries(config.priorityPatterns)) {
				if (patterns.some((pattern) => url.includes(pattern))) {
					return priority;
				}
			}
			return "low";
		}

		// Process prefetch queue
		async function processPrefetchQueue() {
			if (isProcessing || prefetchQueue.size === 0) return;

			isProcessing = true;

			// Sort by priority
			const sorted = Array.from(prefetchQueue.entries()).sort((a, b) => {
				const priorityOrder = { high: 0, medium: 1, low: 2 };
				return priorityOrder[a[1]] - priorityOrder[b[1]];
			});

			// Process top items
			const toProcess = sorted.slice(0, config.maxPrefetchQueue);

			for (const [url] of toProcess) {
				try {
					await window.swManager.prefetchForSwup(url);
					prefetchQueue.delete(url);
				} catch (error) {
					console.error("[SW Integration] Prefetch failed:", url, error);
				}
			}

			isProcessing = false;

			// Continue processing if more items
			if (prefetchQueue.size > 0) {
				setTimeout(processPrefetchQueue, config.prefetchDelay);
			}
		}

		// Add URL to prefetch queue
		function queuePrefetch(url) {
			if (!url || prefetchQueue.has(url)) return;

			const priority = getResourcePriority(url);
			prefetchQueue.set(url, priority);

			// Start processing
			processPrefetchQueue();
		}

		// Setup event listeners for link interactions
		function setupSwupEventListeners() {
			// Listen for link hover events
			document.addEventListener("mouseover", (e) => {
				const link = e.target.closest("a[href]");
				if (link && window.innerWidth > 768) {
					const url = link.href;
					if (url && !url.startsWith("#") && new URL(url).origin === location.origin) {
						queuePrefetch(url);
					}
				}
			});

			// Listen for touchstart events
			document.addEventListener(
				"touchstart",
				(e) => {
					const link = e.target.closest("a[href]");
					if (link) {
						const url = link.href;
						if (url && !url.startsWith("#") && new URL(url).origin === location.origin) {
							queuePrefetch(url);
						}
					}
				},
				{ passive: true },
			);

			// Setup observer after page load
			if ("IntersectionObserver" in window) {
				setupLinkObserver();
			}
		}

		// Intersection Observer for visible links
		let linkObserver;

		function setupLinkObserver() {
			// Clean up existing observer
			if (linkObserver) {
				linkObserver.disconnect();
			}

			linkObserver = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting) {
							const link = entry.target;
							if (link.href && link.href.includes("/posts/")) {
								queuePrefetch(link.href);
							}
						}
					});
				},
				{
					rootMargin: "50px",
					threshold: 0.01,
				},
			);

			// Observe post links
			const links = document.querySelectorAll('a[href*="/posts/"]');
			links.forEach((link) => linkObserver.observe(link));
		}

		// Re-setup observers after Swup navigation
		if (window.swup) {
			window.swup.hooks.on("page:view", () => {
				console.info("[SW Integration] Page view detected, re-setting up observers");
				setupLinkObserver();
			});
		}

		// Network status monitoring
		function setupNetworkMonitoring() {
			if ("connection" in navigator) {
				navigator.connection.addEventListener("change", () => {
					updateNetworkStrategy();
				});
			}

			window.addEventListener("online", () => {
				console.info("[SW Integration] Back online");
				processPrefetchQueue();
			});

			window.addEventListener("offline", () => {
				console.info("[SW Integration] Gone offline");
				// Clear prefetch queue when offline
				prefetchQueue.clear();
			});
		}

		function updateNetworkStrategy() {
			const connection = navigator.connection;

			// Adjust strategy based on connection
			if (connection.saveData || connection.effectiveType === "slow-2g") {
				// Disable prefetching on slow connections
				prefetchQueue.clear();
				config.maxPrefetchQueue = 0;
			} else if (connection.effectiveType === "2g") {
				config.maxPrefetchQueue = 2;
				config.prefetchDelay = 500;
			} else if (connection.effectiveType === "3g") {
				config.maxPrefetchQueue = 3;
				config.prefetchDelay = 200;
			} else {
				// 4g or better
				config.maxPrefetchQueue = 5;
				config.prefetchDelay = 100;
			}
		}

		// Resource hints optimization
		function optimizeResourceHints() {
			// Remove existing prefetch links to avoid duplication
			document.querySelectorAll('link[rel="prefetch"]').forEach((link) => {
				link.remove();
			});

			// Add preconnect for external resources
			const preconnects = ["https://fonts.googleapis.com", "https://fonts.gstatic.com"];

			preconnects.forEach((url) => {
				const link = document.createElement("link");
				link.rel = "preconnect";
				link.href = url;
				link.crossOrigin = "anonymous";
				document.head.appendChild(link);
			});
		}

		// Image lazy loading with SW cache
		function setupImageOptimization() {
			// Native lazy loading
			document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
				// SW will cache these when loaded
				if (img.complete) {
					window.swManager.cacheUrls([img.src]);
				} else {
					img.addEventListener("load", () => {
						window.swManager.cacheUrls([img.src]);
					});
				}
			});
		}

		// Performance monitoring
		function monitorPerformance() {
			if ("PerformanceObserver" in window) {
				// Monitor navigation timing
				const navObserver = new PerformanceObserver((list) => {
					for (const entry of list.getEntries()) {
						if (entry.entryType === "navigation") {
							console.info("[SW Integration] Navigation timing:", {
								domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
								loadComplete: entry.loadEventEnd - entry.loadEventStart,
								fromCache: entry.transferSize === 0,
							});
						}
					}
				});

				try {
					navObserver.observe({ entryTypes: ["navigation"] });
				} catch (e) {
					// Navigation timing might not be available
				}

				// Monitor resource timing
				const resObserver = new PerformanceObserver((list) => {
					for (const entry of list.getEntries()) {
						if (entry.entryType === "resource" && entry.name.includes("/posts/")) {
							const fromCache = entry.transferSize === 0;
							console.info("[SW Integration] Resource loaded:", {
								url: entry.name,
								duration: entry.duration,
								fromCache: fromCache,
							});
						}
					}
				});

				try {
					resObserver.observe({ entryTypes: ["resource"] });
				} catch (e) {
					// Resource timing might not be available
				}
			}
		}

		// Initialize all features
		setupSwupEventListeners();
		setupNetworkMonitoring();
		optimizeResourceHints();
		setupImageOptimization();
		monitorPerformance();

		console.info("[SW Integration] Swup and Service Worker integrated successfully");

		// Public API
		return {
			queuePrefetch,
			clearPrefetchQueue: () => prefetchQueue.clear(),
			getPrefetchQueue: () => Array.from(prefetchQueue.keys()),
			updateNetworkStrategy,
		};
	}

	// Auto-initialize when both Swup and SW Manager are ready
	let waitAttempts = 0;
	const maxWaitAttempts = 50; // 5 seconds max

	function waitForDependencies() {
		if (window.swup && window.swManager) {
			console.info("[SW Integration] Dependencies ready, initializing...");
			window.swupSWIntegration = integrateSwupWithSW();
		} else if (waitAttempts < maxWaitAttempts) {
			waitAttempts++;
			setTimeout(waitForDependencies, 100);
		} else {
			console.warn("[SW Integration] Dependencies not ready after 5 seconds, using fallback");
			// Initialize without full integration
			if (window.swup) {
				console.info("[SW Integration] Swup found, initializing partial integration");
				window.swupSWIntegration = integrateSwupWithSW();
			}
		}
	}

	// Start waiting
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", waitForDependencies);
	} else {
		waitForDependencies();
	}
})(); // IIFE 종료

// Optimized Swup Bundle for Mobile Performance
// This file combines all Swup-related functionality into a single, optimized module

// RequestIdleCallback polyfill for Safari and older browsers
if (!window.requestIdleCallback) {
	window.requestIdleCallback = (callback) => {
		const start = Date.now();
		return setTimeout(() => {
			callback({
				didTimeout: false,
				timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
			});
		}, 1);
	};
}

if (!window.cancelIdleCallback) {
	window.cancelIdleCallback = (id) => {
		clearTimeout(id);
	};
}

// Cache for DOM queries to reduce repeated lookups
const domCache = {
	body: null,
	navbar: null,
	toc: null,
	tocInner: null,
	heightExtend: null,
	backToTopBtn: null,
};

// Configuration constants
const CONFIG = {
	BANNER_HEIGHT: window.BANNER_HEIGHT || 0,
	PREFETCH_DELAY: 150,
	MAX_CACHE_SIZE: 50,
	ANIMATION_DURATION: 50, // Reduced from default for mobile
};

// Utility: Debounce function
function debounce(func, wait) {
	let timeout;
	return function executedFunction(...args) {
		const later = () => {
			clearTimeout(timeout);
			func(...args);
		};
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
}

// Utility: Update DOM cache
function updateDOMCache() {
	domCache.body = document.body;
	domCache.navbar = document.getElementById("navbar-wrapper");
	domCache.toc = document.getElementById("toc-wrapper");
	domCache.tocInner = document.getElementById("toc-inner-wrapper");
	domCache.heightExtend = document.getElementById("page-height-extend");
	domCache.backToTopBtn = document.getElementById("back-to-top-btn");
}

// Initialize Swup optimizations
export function initSwupOptimizations() {
	if (!window.swup) {
		console.warn("Swup is not initialized");
		return;
	}

	// Initial cache update
	updateDOMCache();

	// Combined optimization features
	const swupOptimizer = new SwupOptimizer();
	swupOptimizer.init();

	// Selective preload
	const preloader = new SelectivePreloader();
	preloader.init();

	// Return cleanup function
	return () => {
		swupOptimizer.cleanup();
		preloader.cleanup();
	};
}

// Main Swup Optimizer Class
class SwupOptimizer {
	constructor() {
		this.scrollbarInitialized = false;
		this.scrollbarInstances = new WeakMap();
		this.cachedBannerThreshold = 0;
		this.isTransitioning = false;
	}

	init() {
		this.calculateBannerThreshold();
		this.setupHooks();
		this.initializeScrollbars();
	}

	calculateBannerThreshold() {
		this.cachedBannerThreshold = window.innerHeight * (CONFIG.BANNER_HEIGHT / 100) - 72 - 16;
	}

	setupHooks() {
		// Link click - immediate feedback
		window.swup.hooks.on("link:click", () => {
			this.isTransitioning = true;
			document.documentElement.style.setProperty("--content-delay", "0ms");
			// Add loading indicator for mobile
			if (window.innerWidth <= 768) {
				domCache.body?.classList.add("is-loading");
			}
		});

		// Visit start - prepare for transition
		window.swup.hooks.on("visit:start", (visit) => {
			updateDOMCache();
			this.prepareTransition(visit);
		});

		// Content replace - minimal operations
		window.swup.hooks.on("content:replace", () => {
			// Defer non-critical operations
			requestIdleCallback(() => {
				this.initializeContentScrollbars();
			});
		});

		// Page view - restore UI
		window.swup.hooks.on("page:view", () => {
			requestAnimationFrame(() => {
				this.restoreUI();
			});
		});

		// Visit end - cleanup
		window.swup.hooks.on("visit:end", () => {
			this.isTransitioning = false;
			this.finalizeTransition();
		});
	}

	prepareTransition(visit) {
		const isHome = visit.to.url === "/" || visit.to.url.endsWith("/");

		// Batch DOM updates
		requestAnimationFrame(() => {
			domCache.body?.classList.toggle("lg:is-home", isHome);

			if (domCache.heightExtend) {
				domCache.heightExtend.style.display = "block";
			}

			if (domCache.toc) {
				domCache.toc.classList.add("toc-not-ready");
			}

			// Pause animations on mobile
			if (window.innerWidth <= 768) {
				document.documentElement.style.setProperty("--animation-play-state", "paused");
			}
		});
	}

	restoreUI() {
		if (domCache.heightExtend) {
			domCache.heightExtend.style.display = "none";
		}

		if (domCache.navbar) {
			domCache.navbar.style.transform = "";
			domCache.navbar.style.opacity = "";
			domCache.navbar.classList.remove("navbar-hidden");
		}

		if (domCache.toc) {
			domCache.toc.classList.remove("toc-not-ready");
		}
	}

	finalizeTransition() {
		requestAnimationFrame(() => {
			domCache.body?.classList.remove("is-loading");

			if (window.innerWidth <= 768) {
				document.documentElement.style.setProperty("--animation-play-state", "running");
			}

			// Ensure navbar visibility
			if (domCache.navbar) {
				domCache.navbar.style.transform = "";
				domCache.navbar.style.opacity = "";
			}
		});
	}

	initializeScrollbars() {
		if (this.scrollbarInitialized || !window.OverlayScrollbars) {
			return;
		}

		// Only initialize for desktop
		if (window.innerWidth > 768 && domCache.body) {
			const instance = window.OverlayScrollbars(domCache.body, {
				scrollbars: {
					theme: "scrollbar-base scrollbar-auto py-1",
					autoHide: "move",
					autoHideDelay: 500,
					autoHideSuspend: false,
				},
			});
			this.scrollbarInstances.set(domCache.body, instance);
			this.scrollbarInitialized = true;
		}
	}

	initializeContentScrollbars() {
		if (!window.OverlayScrollbars || window.innerWidth <= 768) {
			return;
		}

		// Initialize TOC scrollbar
		if (domCache.tocInner && !this.scrollbarInstances.has(domCache.tocInner)) {
			window.OverlayScrollbars(domCache.tocInner, {
				scrollbars: {
					theme: "scrollbar-base scrollbar-auto",
					autoHide: "move",
					autoHideDelay: 500,
					autoHideSuspend: false,
				},
			});
			this.scrollbarInstances.set(domCache.tocInner, true);
		}

		// Initialize pre elements scrollbars
		const preElements = document.querySelectorAll("pre:not([data-scrollbar])");
		for (const el of preElements) {
			el.setAttribute("data-scrollbar", "true");
			window.OverlayScrollbars(el, {
				scrollbars: {
					theme: "scrollbar-base scrollbar-dark px-2",
					autoHide: "leave",
					autoHideDelay: 500,
					autoHideSuspend: false,
				},
			});
		}
	}

	cleanup() {
		// Clean up scrollbar instances
		for (const [_element, instance] of this.scrollbarInstances) {
			if (instance && typeof instance.destroy === "function") {
				instance.destroy();
			}
		}
		this.scrollbarInstances.clear();
		this.scrollbarInitialized = false;
	}
}

// Selective Preloader Class
class SelectivePreloader {
	constructor() {
		this.prefetchedUrls = new Set();
		this.hoverTimers = new Map();
		this.touchStartTime = 0;
	}

	init() {
		this.setupListeners();
		this.setupSwupHooks();
	}

	isPostLink(url) {
		try {
			const urlObj = new URL(url, window.location.origin);
			return urlObj.pathname.startsWith("/posts/") || urlObj.pathname.match(/^\/posts\/[^/]+\/?$/);
		} catch (_e) {
			return false;
		}
	}

	prefetchUrl(url) {
		if (this.prefetchedUrls.has(url)) {
			return;
		}

		// Cache size management
		if (this.prefetchedUrls.size >= CONFIG.MAX_CACHE_SIZE) {
			const firstUrl = this.prefetchedUrls.values().next().value;
			this.prefetchedUrls.delete(firstUrl);
		}

		// Use Swup's preload method
		if (window.swup && typeof window.swup.preloadPage === "function") {
			try {
				window.swup.preloadPage(url);
				this.prefetchedUrls.add(url);
			} catch (error) {
				console.error(`Failed to prefetch ${url}:`, error);
			}
		}
	}

	// 링크 엘리먼트 찾기 헬퍼 함수
	findLinkElement(target) {
		// target이 null이거나 Document까지 올라가면 중단
		if (!target || target === document) {
			return null;
		}

		// target이 Element가 아닌 경우 (예: text node) parentElement로 이동
		let element = target.nodeType === Node.ELEMENT_NODE ? target : target.parentElement;

		// 링크를 찾을 때까지 상위로 이동
		while (element && element !== document.body) {
			if (element.tagName === "A" && element.href) {
				return element;
			}
			element = element.parentElement;
		}

		return null;
	}

	handleMouseEnter = (event) => {
		const link = this.findLinkElement(event.target);
		if (!link || !this.shouldPrefetch(link)) {
			return;
		}

		const url = link.href;

		// Clear existing timer
		if (this.hoverTimers.has(url)) {
			clearTimeout(this.hoverTimers.get(url));
		}

		// Debounced prefetch
		const timer = setTimeout(() => {
			this.prefetchUrl(url);
			this.hoverTimers.delete(url);
		}, CONFIG.PREFETCH_DELAY);

		this.hoverTimers.set(url, timer);
	};

	handleMouseLeave = (event) => {
		const link = this.findLinkElement(event.target);
		if (!link) {
			return;
		}

		const url = link.href;
		if (this.hoverTimers.has(url)) {
			clearTimeout(this.hoverTimers.get(url));
			this.hoverTimers.delete(url);
		}
	};

	handleTouchStart = (event) => {
		this.touchStartTime = Date.now();
		const link = this.findLinkElement(event.target);
		if (!link || !this.shouldPrefetch(link)) {
			return;
		}

		// For mobile, prefetch immediately on touch
		this.prefetchUrl(link.href);
	};

	shouldPrefetch(link) {
		return this.isPostLink(link.href) && link.host === window.location.host && !link.hasAttribute("data-no-prefetch");
	}

	setupListeners() {
		// Use passive event listeners for better mobile performance
		const options = { passive: true, capture: true };

		document.addEventListener("mouseenter", this.handleMouseEnter, options);
		document.addEventListener("mouseleave", this.handleMouseLeave, options);
		document.addEventListener("touchstart", this.handleTouchStart, options);
	}

	setupSwupHooks() {
		window.swup.hooks.on("page:view", () => {
			// Re-setup listeners after page change
			this.cleanup();
			this.setupListeners();
		});

		window.swup.hooks.on("visit:start", () => {
			// Clear all pending timers
			for (const timer of this.hoverTimers.values()) {
				clearTimeout(timer);
			}
			this.hoverTimers.clear();
		});
	}

	cleanup() {
		document.removeEventListener("mouseenter", this.handleMouseEnter, true);
		document.removeEventListener("mouseleave", this.handleMouseLeave, true);
		document.removeEventListener("touchstart", this.handleTouchStart, true);

		for (const timer of this.hoverTimers.values()) {
			clearTimeout(timer);
		}
		this.hoverTimers.clear();
		this.prefetchedUrls.clear();
	}
}

// Auto-initialize if Swup is already loaded
if (window.swup) {
	initSwupOptimizations();
} else {
	document.addEventListener("swup:enable", () => {
		initSwupOptimizations();
	});
}

// Export for debugging
window.swupOptimizations = {
	getPrefetchedUrls: () => Array.from(new SelectivePreloader().prefetchedUrls),
	getCacheSize: () => new SelectivePreloader().prefetchedUrls.size,
	clearCache: () => {
		new SelectivePreloader().cleanup();
		console.info("Swup cache cleared");
	},
};

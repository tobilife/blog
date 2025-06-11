// Optimized Swup Bundle V2 - Enhanced Page Transition Performance
// This version focuses on minimizing DOM manipulation and improving mobile performance

// RequestIdleCallback polyfill
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

// Configuration
const CONFIG = {
	BANNER_HEIGHT: window.BANNER_HEIGHT || 0,
	PREFETCH_DELAY: 150,
	MAX_CACHE_SIZE: 50,
	ANIMATION_DURATION: 50,
	MOBILE_BREAKPOINT: 768,
};

// Global state management
const state = {
	isTransitioning: false,
	isMobile: window.innerWidth <= CONFIG.MOBILE_BREAKPOINT,
	currentUrl: window.location.pathname,
	domCache: {},
	pendingOperations: new Set(),
};

// CSS class names for different states
const CSS_CLASSES = {
	loading: "is-loading",
	home: "lg:is-home",
	tocNotReady: "toc-not-ready",
	navbarHidden: "navbar-hidden",
	transitionActive: "swup-transition-active",
};

// Debounce utility
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

// DOM Cache Manager
class DOMCacheManager {
	constructor() {
		this.cache = new Map();
		this.observers = new Map();
	}

	get(id) {
		if (!this.cache.has(id)) {
			const element = document.getElementById(id);
			if (element) {
				this.cache.set(id, element);
				this.observeElement(id, element);
			}
		}
		return this.cache.get(id);
	}

	observeElement(id, element) {
		// Use MutationObserver to detect if element is removed
		const observer = new MutationObserver((_mutations) => {
			if (!document.contains(element)) {
				this.cache.delete(id);
				observer.disconnect();
				this.observers.delete(id);
			}
		});

		observer.observe(element.parentNode || document.body, {
			childList: true,
			subtree: true,
		});

		this.observers.set(id, observer);
	}

	clear() {
		this.cache.clear();
		for (const observer of this.observers) {
			observer.disconnect();
		}
		this.observers.clear();
	}

	update() {
		// Only update elements that might have changed
		const idsToUpdate = ["navbar-wrapper", "toc-wrapper", "page-height-extend"];
		for (const id of idsToUpdate) {
			this.cache.delete(id);
			this.get(id);
		}
	}
}

// Optimized Transition Manager
class TransitionManager {
	constructor() {
		this.domCache = new DOMCacheManager();
		this.transitionStyles = this.createTransitionStyles();
		this.raf = null;
		this.scrollPosition = 0;
	}

	createTransitionStyles() {
		// Create a style element for dynamic transitions
		const style = document.createElement("style");
		style.id = "swup-dynamic-styles";
		style.textContent = `
			.${CSS_CLASSES.transitionActive} * {
				pointer-events: none !important;
			}
			.${CSS_CLASSES.transitionActive} .transition-swup-fade {
				will-change: opacity;
			}
			@media (max-width: ${CONFIG.MOBILE_BREAKPOINT}px) {
				.${CSS_CLASSES.transitionActive} {
					-webkit-tap-highlight-color: transparent;
				}
			}
		`;
		document.head.appendChild(style);
		return style;
	}

	startTransition(visit) {
		// Cancel any pending operations
		if (this.raf) {
			cancelAnimationFrame(this.raf);
		}

		state.isTransitioning = true;
		this.scrollPosition = window.pageYOffset;

		// Use CSS classes instead of inline styles
		document.documentElement.classList.add(CSS_CLASSES.transitionActive);

		// Mobile-specific optimizations
		if (state.isMobile) {
			document.body.classList.add(CSS_CLASSES.loading);
			// Disable smooth scrolling during transition
			document.documentElement.style.scrollBehavior = "auto";
		}

		// Prepare UI elements
		this.prepareUIElements(visit);
	}

	prepareUIElements(visit) {
		const isHome = visit.to.url === "/" || visit.to.url.endsWith("/");

		// Use a single RAF for all DOM updates
		this.raf = requestAnimationFrame(() => {
			// Update body class
			document.body.classList.toggle(CSS_CLASSES.home, isHome);

			// Update height extend
			const heightExtend = this.domCache.get("page-height-extend");
			if (heightExtend) {
				heightExtend.style.display = "block";
			}

			// Update TOC
			const toc = this.domCache.get("toc-wrapper");
			if (toc) {
				toc.classList.add(CSS_CLASSES.tocNotReady);
			}

			// For mobile, minimize DOM operations
			if (!state.isMobile) {
				this.updateNavbar();
			}
		});
	}

	updateNavbar() {
		const navbar = this.domCache.get("navbar-wrapper");
		if (!navbar) {
			return;
		}

		const threshold = window.innerHeight * (CONFIG.BANNER_HEIGHT / 100) - 72 - 16;
		if (this.scrollPosition >= threshold && document.body.classList.contains(CSS_CLASSES.home)) {
			navbar.classList.add(CSS_CLASSES.navbarHidden);
		}
	}

	contentReplaced() {
		// Update cache after content replacement
		this.domCache.update();

		// Defer non-critical operations
		if (!state.isMobile) {
			requestIdleCallback(() => {
				this.initializeScrollbars();
			});
		}
	}

	endTransition() {
		state.isTransitioning = false;

		// Remove transition classes
		document.documentElement.classList.remove(CSS_CLASSES.transitionActive);
		document.body.classList.remove(CSS_CLASSES.loading);

		// Restore scroll behavior
		if (state.isMobile) {
			document.documentElement.style.scrollBehavior = "";
		}

		// Use RAF for final UI updates
		requestAnimationFrame(() => {
			// Hide height extend
			const heightExtend = this.domCache.get("page-height-extend");
			if (heightExtend) {
				heightExtend.style.display = "none";
			}

			// Show TOC
			const toc = this.domCache.get("toc-wrapper");
			if (toc) {
				toc.classList.remove(CSS_CLASSES.tocNotReady);
			}

			// Ensure navbar is visible
			const navbar = this.domCache.get("navbar-wrapper");
			if (navbar) {
				navbar.classList.remove(CSS_CLASSES.navbarHidden);
				navbar.style.transform = "";
				navbar.style.opacity = "";
			}
		});
	}

	initializeScrollbars() {
		if (!window.OverlayScrollbars || state.isMobile) {
			return;
		}

		const tocInner = this.domCache.get("toc-inner-wrapper");
		if (tocInner && !tocInner.hasAttribute("data-scrollbar")) {
			tocInner.setAttribute("data-scrollbar", "true");
			window.OverlayScrollbars(tocInner, {
				scrollbars: {
					theme: "scrollbar-base scrollbar-auto",
					autoHide: "move",
					autoHideDelay: 500,
				},
			});
		}

		// Initialize pre elements
		const preElements = document.querySelectorAll("pre:not([data-scrollbar])");
		for (const el of preElements) {
			el.setAttribute("data-scrollbar", "true");
			window.OverlayScrollbars(el, {
				scrollbars: {
					theme: "scrollbar-base scrollbar-dark px-2",
					autoHide: "leave",
					autoHideDelay: 500,
				},
			});
		}
	}

	cleanup() {
		if (this.transitionStyles?.parentNode) {
			this.transitionStyles.parentNode.removeChild(this.transitionStyles);
		}
		this.domCache.clear();
		if (this.raf) {
			cancelAnimationFrame(this.raf);
		}
	}
}

// Optimized Preloader
class OptimizedPreloader {
	constructor() {
		this.cache = new Map();
		this.pending = new Set();
		this.observer = null;
	}

	init() {
		// Use Intersection Observer for efficient link detection
		this.setupIntersectionObserver();
		this.setupEventListeners();
		this.setupSwupHooks();
	}

	setupIntersectionObserver() {
		if (!("IntersectionObserver" in window)) {
			return;
		}

		this.observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const link = entry.target;
						if (this.shouldPrefetch(link)) {
							this.schedulePrefetch(link.href);
						}
					}
				}
			},
			{
				rootMargin: "50px",
				threshold: 0.01,
			},
		);

		// Observe all post links
		this.observeLinks();
	}

	observeLinks() {
		const links = document.querySelectorAll('a[href*="/posts/"]');
		for (const link of links) {
			if (this.shouldPrefetch(link)) {
				this.observer.observe(link);
			}
		}
	}

	shouldPrefetch(link) {
		if (!link || !link.href) {
			return false;
		}

		try {
			const url = new URL(link.href);
			return (
				url.host === window.location.host &&
				url.pathname.includes("/posts/") &&
				!link.hasAttribute("data-no-prefetch") &&
				!this.cache.has(url.href) &&
				!this.pending.has(url.href)
			);
		} catch {
			return false;
		}
	}

	schedulePrefetch(url, priority = "low") {
		if (this.cache.has(url) || this.pending.has(url)) {
			return;
		}

		this.pending.add(url);

		const prefetch = () => {
		 // Check if swup is fully initialized with preloadPage method
		 if (window.swup && window.swup.preloadPage && typeof window.swup.preloadPage === "function") {
		  window.swup
		   .preloadPage(url)
		   .then(() => {
		    this.cache.set(url, Date.now());
		    this.pending.delete(url);
		    // Clean old cache entries
		    this.cleanCache();
		   })
		   .catch(() => {
		    this.pending.delete(url);
		   });
		 } else {
		  // If preloadPage is not available, remove from pending
		  this.pending.delete(url);
		 }
		};

		if (priority === "high" || state.isMobile) {
			// Immediate prefetch for mobile or high priority
			prefetch();
		} else {
			// Delayed prefetch for desktop
			requestIdleCallback(prefetch, { timeout: 2000 });
		}
	}

	cleanCache() {
		if (this.cache.size <= CONFIG.MAX_CACHE_SIZE) {
			return;
		}

		// Remove oldest entries
		const entries = Array.from(this.cache.entries());
		entries.sort((a, b) => a[1] - b[1]);

		const toRemove = entries.slice(0, entries.length - CONFIG.MAX_CACHE_SIZE);
		for (const [url] of toRemove) {
			this.cache.delete(url);
		}
	}

	setupEventListeners() {
		// Touch events for mobile
		if ("ontouchstart" in window) {
			document.addEventListener("touchstart", this.handleTouch, { passive: true });
		}

		// Hover for desktop
		document.addEventListener("mouseenter", this.handleHover, true);
	}

	handleTouch = (event) => {
		const link = event.target.closest("a[href]");
		if (link && this.shouldPrefetch(link)) {
			this.schedulePrefetch(link.href, "high");
		}
	};

	handleHover = debounce((event) => {
		const link = event.target.closest("a[href]");
		if (link && this.shouldPrefetch(link)) {
			this.schedulePrefetch(link.href, "low");
		}
	}, CONFIG.PREFETCH_DELAY);

	setupSwupHooks() {
		if (!window.swup) {
			return;
		}

		window.swup.hooks.on("page:view", () => {
			// Re-observe new links
			if (this.observer) {
				this.observeLinks();
			}
		});
	}

	cleanup() {
		if (this.observer) {
			this.observer.disconnect();
		}
		document.removeEventListener("touchstart", this.handleTouch);
		document.removeEventListener("mouseenter", this.handleHover, true);
		this.cache.clear();
		this.pending.clear();
	}
}

// Main initialization
export function initSwupOptimizations() {
	if (!window.swup) {
		console.warn("Swup is not initialized");
		return;
	}

	// Update mobile state
	state.isMobile = window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;

	// Initialize managers
	const transitionManager = new TransitionManager();
	const preloader = new OptimizedPreloader();

	// Setup Swup hooks
	window.swup.hooks.on("link:click", () => {
		document.documentElement.style.setProperty("--content-delay", "0ms");
	});

	window.swup.hooks.on("visit:start", (visit) => {
		transitionManager.startTransition(visit);
	});

	window.swup.hooks.on("content:replace", () => {
		transitionManager.contentReplaced();
	});

	window.swup.hooks.on("visit:end", () => {
		transitionManager.endTransition();
	});

	// Initialize preloader
	preloader.init();

	// Initialize Service Worker (optional)
	initServiceWorker();

	// Handle resize events
	let resizeTimer;
	window.addEventListener("resize", () => {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(() => {
			state.isMobile = window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;
		}, 250);
	});

	// Cleanup function
	window.swupOptimizationsCleanup = () => {
		transitionManager.cleanup();
		preloader.cleanup();
	};

	// Expose for debugging
	window.swupOptimizationsDebug = {
		state,
		cache: transitionManager.domCache,
		preloader: {
			cached: () => Array.from(preloader.cache.keys()),
			pending: () => Array.from(preloader.pending),
		},
	};

	console.info("Swup optimizations V2 initialized");
}

// Initialize Service Worker (optional)
function initServiceWorker() {
	// Load SW manager script
	const script = document.createElement("script");
	script.src = "/scripts/optimized/sw-manager.js";
	script.defer = true;
	script.onload = () => {
		console.info("Service Worker Manager loaded");
		// Load SW integration after manager is ready
		if (window.swManager) {
			const integrationScript = document.createElement("script");
			integrationScript.src = "/scripts/optimized/swup-sw-integration.js";
			integrationScript.defer = true;
			integrationScript.onload = () => {
				console.info("SW Integration loaded");
				// The script will initialize itself automatically
			};
			document.head.appendChild(integrationScript);
		}
	};
	script.onerror = () => {
		console.warn("Service Worker Manager failed to load");
	};
	document.head.appendChild(script);
}

// Auto-initialize
if (window.swup) {
	initSwupOptimizations();
} else {
	document.addEventListener("swup:enable", initSwupOptimizations);
}

// Service Worker Registration and Management
// This script handles SW registration with mobile optimizations

(() => {
	// Prevent duplicate initialization
	if (window.swManager) {
		return;
	}

	class ServiceWorkerManager {
		constructor() {
			this.swPath = "/service-worker.js";
			this.isSupported = "serviceWorker" in navigator;
			this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
			this.registration = null;
		}

		async init() {
			if (!this.isSupported) {
				console.info("[SW Manager] Service Workers not supported");
				return;
			}

			// Check if we should register SW
			if (this.shouldRegister()) {
				await this.register();
				this.setupEventHandlers();
				this.setupUpdateChecker();
			}
		}

		shouldRegister() {
			// Skip SW on very slow connections or data saver mode
			if ("connection" in navigator) {
				const connection = navigator.connection;
				if (connection.saveData || connection.effectiveType === "slow-2g") {
					console.info("[SW Manager] Skipping SW due to slow connection");
					return false;
				}
			}
			return true;
		}

		async register() {
			try {
				this.registration = await navigator.serviceWorker.register(this.swPath, {
					scope: "/",
					updateViaCache: "none",
				});

				console.info("[SW Manager] Service Worker registered successfully");

				// Check for updates
				if (this.registration.waiting) {
					this.promptUpdate();
				}

				this.registration.addEventListener("updatefound", () => {
					console.info("[SW Manager] New Service Worker found");
					const newWorker = this.registration.installing;

					newWorker.addEventListener("statechange", () => {
						if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
							this.promptUpdate();
						}
					});
				});
			} catch (error) {
				console.error("[SW Manager] Registration failed:", error);
			}
		}

		setupEventHandlers() {
			// Handle controller change
			let refreshing = false;
			navigator.serviceWorker.addEventListener("controllerchange", () => {
				if (!refreshing) {
					refreshing = true;
					window.location.reload();
				}
			});

			// Handle messages from SW
			navigator.serviceWorker.addEventListener("message", (event) => {
				this.handleSWMessage(event.data);
			});
		}

		setupUpdateChecker() {
			// Check for updates periodically (every 60 minutes)
			setInterval(
				() => {
					if (this.registration) {
						this.registration.update();
					}
				},
				60 * 60 * 1000,
			);

			// Check on visibility change
			document.addEventListener("visibilitychange", () => {
				if (!document.hidden && this.registration) {
					this.registration.update();
				}
			});
		}

		promptUpdate() {
			// For mobile, auto-update without prompt
			if (this.isMobile) {
				this.skipWaiting();
				return;
			}

			// Desktop: Show update notification
			const updateBanner = document.createElement("div");
			updateBanner.className = "sw-update-banner";
			updateBanner.innerHTML = `
        <div class="sw-update-content">
          <span>새로운 버전이 있습니다!</span>
          <button id="sw-update-btn" class="sw-update-btn">업데이트</button>
          <button id="sw-dismiss-btn" class="sw-dismiss-btn">나중에</button>
        </div>
      `;

			document.body.appendChild(updateBanner);

			document.getElementById("sw-update-btn").addEventListener("click", () => {
				this.skipWaiting();
				updateBanner.remove();
			});

			document.getElementById("sw-dismiss-btn").addEventListener("click", () => {
				updateBanner.remove();
			});
		}

		skipWaiting() {
			if (this.registration && this.registration.waiting) {
				this.registration.waiting.postMessage({ type: "SKIP_WAITING" });
			}
		}

		handleSWMessage(data) {
			switch (data.type) {
				case "CACHE_UPDATED":
					console.info("[SW Manager] Cache updated:", data.url);
					break;
				case "OFFLINE_READY":
					console.info("[SW Manager] Offline mode ready");
					break;
				default:
					console.info("[SW Manager] Message from SW:", data);
			}
		}

		// Public methods for cache management
		async cacheUrls(urls) {
			if (!this.registration || !this.registration.active) return;

			this.registration.active.postMessage({
				type: "CACHE_URLS",
				urls: urls,
			});
		}

		async clearCache(cacheName) {
			if (!this.registration || !this.registration.active) return;

			this.registration.active.postMessage({
				type: "CLEAR_CACHE",
				cacheName: cacheName,
			});
		}

		// Prefetch management for Swup integration
		async prefetchForSwup(url) {
			if (!this.registration || !this.registration.active) return;

			// Use SW to cache the page
			this.cacheUrls([url]);
		}
	}

	// Initialize SW Manager
	const swManager = new ServiceWorkerManager();

	// Auto-init when DOM is ready
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", () => swManager.init());
	} else {
		swManager.init();
	}

	// Export for global use
	window.swManager = swManager;

	// Add styles for update banner
	const style = document.createElement("style");
	style.textContent = `
    .sw-update-banner {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--color-card-bg, #fff);
      border: 1px solid var(--color-border, #e0e0e0);
      border-radius: 8px;
      padding: 16px 20px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      z-index: 9999;
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        transform: translateX(-50%) translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
    }

    .sw-update-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .sw-update-btn,
    .sw-dismiss-btn {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }

    .sw-update-btn {
      background: var(--color-accent, #007bff);
      color: white;
    }

    .sw-update-btn:hover {
      opacity: 0.9;
    }

    .sw-dismiss-btn {
      background: transparent;
      color: var(--color-text-muted, #666);
    }

    .sw-dismiss-btn:hover {
      background: var(--color-bg-secondary, #f5f5f5);
    }

    @media (max-width: 768px) {
      .sw-update-banner {
        bottom: 10px;
        left: 10px;
        right: 10px;
        transform: none;
      }
    }
  `;
	document.head.appendChild(style);
})();

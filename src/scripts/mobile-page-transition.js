// Mobile-specific page transition optimizations

export function initMobilePageTransitions() {
	// Check if it's a mobile device
	const isMobile =
		/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
		window.innerWidth < 768;

	if (!isMobile || !window.swup) {
		return;
	}

	// Mobile-optimized transition settings
	const MOBILE_TRANSITION_DURATION = 150; // Reduced from default
	const MOBILE_ANIMATION_DURATION = 100; // Faster animation

	// Override Swup default options for mobile
	window.swup.options.animationDuration = MOBILE_ANIMATION_DURATION;

	// Cache mobile-specific elements
	const mobileCache = {
		navbar: null,
		mainContent: null,
		footer: null,
	};

	function updateMobileCache() {
		mobileCache.navbar = document.getElementById("navbar-wrapper");
		mobileCache.mainContent = document.getElementById("swup-container");
		mobileCache.footer = document.querySelector("footer");
	}

	// Simplified mobile transitions
	window.swup.hooks.on("visit:start", () => {
		updateMobileCache();

		// Disable heavy animations on mobile
		document.documentElement.classList.add("mobile-transitioning");

		// Immediately hide non-essential elements
		if (mobileCache.footer) {
			mobileCache.footer.style.opacity = "0";
		}

		// Reduce motion for mobile
		document.documentElement.style.setProperty("--mobile-transition-duration", `${MOBILE_TRANSITION_DURATION}ms`);
	});

	window.swup.hooks.on("content:replace", () => {
		// Skip unnecessary operations on mobile
		updateMobileCache();

		// Faster content appearance
		if (mobileCache.mainContent) {
			mobileCache.mainContent.style.opacity = "1";
		}
	});

	window.swup.hooks.on("visit:end", () => {
		// Quick cleanup
		requestAnimationFrame(() => {
			document.documentElement.classList.remove("mobile-transitioning");

			// Restore footer
			if (mobileCache.footer) {
				mobileCache.footer.style.opacity = "";
			}
		});
	});

	// Mobile-specific link handling
	document.addEventListener(
		"touchstart",
		(e) => {
			const link = e.target.closest("a[href]");
			if (!link || link.origin !== window.location.origin) {
				return;
			}

			// Provide immediate feedback
			link.classList.add("touch-active");
		},
		{ passive: true },
	);

	document.addEventListener(
		"touchend",
		() => {
			// Remove all touch states
			const activeLinks = document.querySelectorAll(".touch-active");
			for (const link of activeLinks) {
				link.classList.remove("touch-active");
			}
		},
		{ passive: true },
	);

	// Add mobile-specific styles
	const style = document.createElement("style");
	style.textContent = `
		/* Mobile-specific transition optimizations */
		@media (max-width: 768px) {
			.mobile-transitioning * {
				animation-duration: var(--mobile-transition-duration, 150ms) !important;
				transition-duration: var(--mobile-transition-duration, 150ms) !important;
			}

			.mobile-transitioning .transition-swup-fade {
				transition: opacity var(--mobile-transition-duration, 150ms) ease-out !important;
			}

			/* Simpler fade for mobile */
			html.is-animating .transition-swup-fade {
				opacity: 0.7 !important; /* Not fully transparent for faster perception */
			}

			/* Disable complex animations on mobile */
			.mobile-transitioning .onload-animation,
			.mobile-transitioning [class*="animate-"] {
				animation: none !important;
			}

			/* Touch feedback */
			.touch-active {
				opacity: 0.7 !important;
				transform: scale(0.98) !important;
				transition: all 100ms ease-out !important;
			}

			/* Simplified loading indicator */
			body.is-changing::before {
				animation-duration: 0.6s !important;
			}

			/* Disable blur effects during transition */
			.mobile-transitioning .blur,
			.mobile-transitioning .backdrop-blur {
				backdrop-filter: none !important;
				-webkit-backdrop-filter: none !important;
			}

			/* Skip scroll animations on mobile */
			.mobile-transitioning {
				scroll-behavior: auto !important;
			}
		}

		/* High performance mode for low-end devices */
		@media (max-width: 768px) and (hover: none) {
			.transition-swup-fade {
				will-change: auto !important;
			}

			/* Use transform for better performance */
			html.is-animating #swup-container {
				transform: translateY(10px);
				opacity: 0.8 !important;
			}

			html:not(.is-animating) #swup-container {
				transform: translateY(0);
			}
		}
	`;
	document.head.appendChild(style);

	console.info("Mobile page transition optimizations initialized");
}

// Auto-initialize if Swup is ready
if (window.swup) {
	initMobilePageTransitions();
} else {
	document.addEventListener("swup:enable", initMobilePageTransitions);
}

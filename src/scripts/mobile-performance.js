// Mobile performance optimization for post cards
export function optimizeMobilePostCards() {
	// Check if mobile device
	const isMobile = window.matchMedia("(max-width: 768px)").matches;
	const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;

	if (!isMobile || !isTouchDevice) {
		return;
	}

	// Optimize post card interactions
	function optimizePostCardClicks() {
		const postCards = document.querySelectorAll(".card-base");

		for (const card of postCards) {
			const links = card.querySelectorAll("a");

			for (const link of links) {
				// Remove all will-change properties
				link.style.willChange = "auto";

				// Add touch feedback immediately
				link.addEventListener(
					"touchstart",
					(_e) => {
						// Immediate visual feedback
						link.style.opacity = "0.8";
						link.style.transition = "opacity 50ms";

						// Preload the target page
						if (window.swup && link.href) {
							window.swup.preloadPage(link.href);
						}
					},
					{ passive: true },
				);

				link.addEventListener(
					"touchend",
					() => {
						// Reset opacity
						setTimeout(() => {
							link.style.opacity = "";
						}, 100);
					},
					{ passive: true },
				);

				// Prevent double tap zoom delay
				link.style.touchAction = "manipulation";
			}

			// Optimize image loading
			const images = card.querySelectorAll("img");
			for (const img of images) {
				// Set aspect ratio to prevent layout shifts
				if (!img.style.aspectRatio) {
					img.style.aspectRatio = "16 / 9";
				}
				img.style.objectFit = "cover";
			}

			// Simplify complex width calculations
			const complexWidthElements = card.querySelectorAll('[class*="w-[calc"], [class*="md:w-[calc"]');
			for (const el of complexWidthElements) {
				if (isMobile) {
					el.style.width = "100%";
				}
			}
		}
	}

	// Debounced resize handler
	let resizeTimeout;
	function handleResize() {
		clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(() => {
			const newIsMobile = window.matchMedia("(max-width: 768px)").matches;
			if (newIsMobile !== isMobile) {
				window.location.reload();
			}
		}, 250);
	}

	// Run optimizations
	optimizePostCardClicks();

	// Re-run on page transitions
	if (window.swup) {
		window.swup.hooks.on("page:view", () => {
			requestAnimationFrame(optimizePostCardClicks);
		});
	}

	// Handle orientation changes
	window.addEventListener("resize", handleResize, { passive: true });
}

// Initialize on DOM ready
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", optimizeMobilePostCards);
} else {
	optimizeMobilePostCards();
}

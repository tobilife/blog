// Performance optimizations for Swup page transitions

export function optimizeSwupTransitions() {
	if (!window.swup) return;

	// Disable unnecessary plugins during transition
	window.swup.hooks.on("visit:start", () => {
		// Pause any running animations
		document.querySelectorAll(".transition, .transition-all").forEach((el) => {
			el.style.transition = "none";
		});

		// Hide non-critical elements during transition
		const toc = document.getElementById("toc-wrapper");
		if (toc) toc.style.display = "none";

		// Disable scroll events temporarily
		document.body.style.pointerEvents = "none";
	});

	window.swup.hooks.on("content:replace", () => {
		// Re-enable pointer events
		document.body.style.pointerEvents = "";
	});

	window.swup.hooks.on("visit:end", () => {
		// Restore elements after a short delay
		requestAnimationFrame(() => {
			// Re-enable transitions
			document.querySelectorAll('[style*="transition: none"]').forEach((el) => {
				el.style.transition = "";
			});

			// Show TOC
			const toc = document.getElementById("toc-wrapper");
			if (toc) toc.style.display = "";

			// Reset cursor to default
			document.body.style.cursor = "";
		});
	});

	// Optimize link clicks
	document.addEventListener(
		"click",
		(e) => {
			const link = e.target.closest("a[href]");
			if (!link || link.origin !== window.location.origin) return;

			// Add loading state immediately
			link.style.opacity = "0.7";
			document.body.style.cursor = "wait";
		},
		{ capture: true, passive: true },
	);
}

// IMPORTANT: Commented out auto-initialization to prevent unwanted execution
// This file is imported but not used - we use ultraOptimizeSwup instead
// Leaving this commented to prevent accidental cursor issues

// if (window.swup) {
//   optimizeSwupTransitions();
// } else {
//   document.addEventListener('swup:enable', optimizeSwupTransitions);
// }

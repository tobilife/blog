// Post page transition optimizations for Swup
export function optimizePostTransitions() {
	if (!window.swup) {
		return;
	}

	// Add class before page transition starts
	window.swup.hooks.on("visit:start", (visit) => {
		// Check if navigating to a post page
		if (visit.to.url.includes("/posts/")) {
			document.documentElement.classList.add("post-transition");

			// Pre-inject critical styles if not already present
			if (!document.querySelector("#post-critical-styles")) {
				const style = document.createElement("style");
				style.id = "post-critical-styles";
				style.textContent = `
					#post-container { opacity: 0; }
					.onload-animation { opacity: 0; }
					.markdown-content { min-height: 20vh; }
					#post-cover { aspect-ratio: 16/9; background-color: rgba(128,128,128,0.1); }
				`;
				document.head.appendChild(style);
			}
		}
	});

	// Handle post page after content is replaced
	window.swup.hooks.on("content:replace", () => {
		const postContainer = document.getElementById("post-container");
		if (postContainer) {
			// Reset states
			postContainer.classList.remove("loaded");
			document.body.classList.remove("post-loaded");

			// Force reflow to ensure styles are applied
			void postContainer.offsetHeight;

			// Check if all critical resources are loaded
			requestAnimationFrame(() => {
				checkPostResourcesLoaded();
			});
		}
	});

	// Clean up after transition
	window.swup.hooks.on("page:view", () => {
		document.documentElement.classList.remove("post-transition");
	});
}

function checkPostResourcesLoaded() {
	const postContainer = document.getElementById("post-container");
	if (!postContainer) {
		return;
	}

	// Check images
	const images = postContainer.querySelectorAll("img");
	const imagePromises = Array.from(images).map((img) => {
		if (img.complete) {
			return Promise.resolve();
		}
		return new Promise((resolve) => {
			img.addEventListener("load", resolve, { once: true });
			img.addEventListener("error", resolve, { once: true });
			// Timeout after 3 seconds
			setTimeout(resolve, 3000);
		});
	});

	// Check fonts
	const fontPromise = document.fonts.ready;

	// Wait for all resources
	Promise.all([...imagePromises, fontPromise])
		.then(() => {
			// Add a small delay to ensure smooth transition
			setTimeout(() => {
				postContainer.classList.add("loaded");
				document.body.classList.add("post-loaded");
			}, 50);
		})
		.catch(() => {
			// Even on error, show the content
			postContainer.classList.add("loaded");
			document.body.classList.add("post-loaded");
		});
}

// Mobile-specific optimizations
if (window.matchMedia("(max-width: 768px)").matches) {
	// Reduce animation delays on mobile
	document.documentElement.style.setProperty("--post-animation-delay", "0ms");
}

// Initialize
if (window.swup) {
	optimizePostTransitions();
} else {
	document.addEventListener("swup:enable", optimizePostTransitions);
}

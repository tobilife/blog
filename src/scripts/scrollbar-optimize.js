// Ultra-lightweight custom scrollbar initialization
let bodyScrollbarInitialized = false;
const scrollbarInstances = new WeakMap();

function initLightweightScrollbar() {
	const bodyElement = document.body;

	// Initialize body scrollbar only once
	if (!bodyScrollbarInitialized && window.OverlayScrollbars) {
		const instance = OverlayScrollbars(bodyElement, {
			scrollbars: {
				theme: "scrollbar-base scrollbar-auto py-1",
				autoHide: "move",
				autoHideDelay: 500,
				autoHideSuspend: false,
			},
		});
		scrollbarInstances.set(bodyElement, instance);
		bodyScrollbarInitialized = true;
	}

	// Defer pre and katex scrollbar initialization
	requestIdleCallback(
		() => {
			initContentScrollbars();
		},
		{ timeout: 1000 },
	);
}

function initContentScrollbars() {
	// Initialize pre scrollbars only for visible elements
	const preElements = document.querySelectorAll(
		"pre:not([data-scrollbar-init])",
	);
	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting && window.OverlayScrollbars) {
					const element = entry.target;
					element.setAttribute("data-scrollbar-init", "true");

					OverlayScrollbars(element, {
						scrollbars: {
							theme: "scrollbar-base scrollbar-dark px-2",
							autoHide: "leave",
							autoHideDelay: 500,
							autoHideSuspend: false,
						},
					});

					observer.unobserve(element);
				}
			}
		},
		{ rootMargin: "200px" },
	);

	for (const el of preElements) {
		observer.observe(el);
	}

	// Handle KaTeX elements similarly
	const katexElements = document.querySelectorAll(
		".katex-display:not([data-scrollbar-init])",
	);
	for (const el of katexElements) {
		observer.observe(el);
	}
}

export { initLightweightScrollbar, initContentScrollbars };

// Selective Swup preload for post links only
// 포스트 링크만 선택적으로 프리로드하는 최적화된 스크립트

export function initSelectivePreload() {
	if (!window.swup) {
		console.warn("Swup is not initialized");
		return;
	}

	// 프리페치된 URL을 추적하여 중복 방지
	const prefetchedUrls = new Set();

	// 디바운스 타이머를 저장할 맵
	const hoverTimers = new Map();

	// 프리페치 디바운스 시간 (ms)
	const PREFETCH_DELAY = 150;

	// 캐시 크기 제한
	const MAX_CACHE_SIZE = 50;

	// 포스트 링크인지 확인하는 함수
	function isPostLink(url) {
		try {
			const urlObj = new URL(url, window.location.origin);
			// trailing slash가 있거나 없는 경우 모두 처리
			return urlObj.pathname.startsWith("/posts/") || urlObj.pathname.match(/^\/posts\/[^/]+\/?$/);
		} catch (_e) {
			return false;
		}
	}

	// URL 프리페치 함수
	function prefetchUrl(url) {
		// 이미 프리페치된 URL은 스킵
		if (prefetchedUrls.has(url)) {
			return;
		}

		// 캐시 크기 제한 체크
		if (prefetchedUrls.size >= MAX_CACHE_SIZE) {
			// 가장 오래된 항목 제거 (Set은 삽입 순서를 유지)
			const firstUrl = prefetchedUrls.values().next().value;
			prefetchedUrls.delete(firstUrl);
		}

		// Swup의 preload 메서드 사용
		if (window.swup && typeof window.swup.preloadPage === "function") {
			try {
				window.swup.preloadPage(url);
				prefetchedUrls.add(url);
				console.info(`Prefetched: ${url}`);
			} catch (error) {
				console.error(`Failed to prefetch ${url}:`, error);
			}
		}
	}

	// 링크 엘리먼트 찾기 헬퍼 함수
	function findLinkElement(target) {
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

	// 마우스 호버 핸들러
	function handleMouseEnter(event) {
		const link = findLinkElement(event.target);
		if (!link) {
			return;
		}

		const url = link.href;

		// 포스트 링크가 아니면 무시
		if (!isPostLink(url)) {
			return;
		}

		// 외부 링크는 무시
		if (link.host !== window.location.host) {
			return;
		}

		// 이미 타이머가 있으면 취소
		if (hoverTimers.has(url)) {
			clearTimeout(hoverTimers.get(url));
		}

		// 디바운스된 프리페치
		const timer = setTimeout(() => {
			prefetchUrl(url);
			hoverTimers.delete(url);
		}, PREFETCH_DELAY);

		hoverTimers.set(url, timer);
	}

	// 마우스 리브 핸들러
	function handleMouseLeave(event) {
		const link = findLinkElement(event.target);
		if (!link) {
			return;
		}

		const url = link.href;

		// 타이머가 있으면 취소
		if (hoverTimers.has(url)) {
			clearTimeout(hoverTimers.get(url));
			hoverTimers.delete(url);
		}
	}

	// 터치 디바이스를 위한 핸들러
	function handleTouchStart(event) {
		const link = findLinkElement(event.target);
		if (!link) {
			return;
		}

		const url = link.href;

		// 포스트 링크만 처리
		if (!isPostLink(url)) {
			return;
		}

		// 외부 링크는 무시
		if (link.host !== window.location.host) {
			return;
		}

		// 즉시 프리페치 (터치는 클릭 의도가 명확)
		prefetchUrl(url);
	}

	// 이벤트 리스너 설정
	function setupListeners() {
		// 기존 리스너 제거 (중복 방지)
		document.removeEventListener("mouseenter", handleMouseEnter, true);
		document.removeEventListener("mouseleave", handleMouseLeave, true);
		document.removeEventListener("touchstart", handleTouchStart, { passive: true });

		// 새 리스너 추가
		document.addEventListener("mouseenter", handleMouseEnter, true);
		document.addEventListener("mouseleave", handleMouseLeave, true);
		document.addEventListener("touchstart", handleTouchStart, { passive: true });
	}

	// Swup 페이지 전환 후 리스너 재설정
	function setupSwupHooks() {
		window.swup.hooks.on("page:view", () => {
			// 페이지 전환 후 리스너 재설정
			setupListeners();
		});

		window.swup.hooks.on("visit:start", () => {
			// 페이지 전환 시작 시 모든 타이머 정리
			for (const timer of hoverTimers.values()) {
				clearTimeout(timer);
			}
			hoverTimers.clear();
		});
	}

	// 초기화
	setupListeners();
	setupSwupHooks();

	// 디버깅용 정보 출력
	console.info("Selective preload initialized for post links");

	// 전역 객체에 디버깅 함수 노출
	window.selectivePreload = {
		getPrefetchedUrls: () => Array.from(prefetchedUrls),
		getCacheSize: () => prefetchedUrls.size,
		clearCache: () => {
			prefetchedUrls.clear();
			console.info("Prefetch cache cleared");
		},
	};

	// Swup 비활성화 시 정리 함수를 window에 저장
	window.cleanupSelectivePreload = () => {
		// 모든 이벤트 리스너 제거
		document.removeEventListener("mouseenter", handleMouseEnter, true);
		document.removeEventListener("mouseleave", handleMouseLeave, true);
		document.removeEventListener("touchstart", handleTouchStart, { passive: true });

		// 타이머 정리
		for (const timer of hoverTimers.values()) {
			clearTimeout(timer);
		}
		hoverTimers.clear();

		// 캐시 정리
		prefetchedUrls.clear();

		// 전역 객체 제거
		window.selectivePreload = undefined;
		window.cleanupSelectivePreload = undefined;
	};
}

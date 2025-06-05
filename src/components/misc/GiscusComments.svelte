<script lang="ts">
import { onMount } from "svelte";

export let className = "";

let mounted = false;
let giscusFrame: HTMLIFrameElement | null = null;

// 초기 테마 설정
function getCurrentTheme() {
	const isDark = document.documentElement.classList.contains("dark");
	return isDark ? "dark" : "light";
}

// Giscus 테마 업데이트 함수
function updateGiscusTheme(theme: string) {
	const iframe = document.querySelector<HTMLIFrameElement>(".giscus-frame");
	if (iframe?.contentWindow) {
		iframe.contentWindow.postMessage(
			{ giscus: { setConfig: { theme } } },
			"https://giscus.app",
		);
	}
}

onMount(() => {
	mounted = true;

	// Giscus가 로드된 후 초기 테마 설정
	const checkGiscusLoaded = setInterval(() => {
		giscusFrame = document.querySelector<HTMLIFrameElement>(".giscus-frame");
		if (giscusFrame) {
			clearInterval(checkGiscusLoaded);
			// 초기 테마 적용
			setTimeout(() => {
				updateGiscusTheme(getCurrentTheme());
			}, 100);
		}
	}, 100);

	// 테마 변경 감지
	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.attributeName === "class") {
				const newTheme = getCurrentTheme();
				updateGiscusTheme(newTheme);
			}
		}
	});

	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["class"],
	});

	// 클린업
	return () => {
		observer.disconnect();
		if (checkGiscusLoaded) {
			clearInterval(checkGiscusLoaded);
		}
	};
});
</script>

{#if mounted}
  <div class={`giscus-container ${className}`}>
    <script
      src="https://giscus.app/client.js"
      data-repo="tobilife/blog"
      data-repo-id="R_kgDOOwjHjg"
      data-category="Announcements"
      data-category-id="DIC_kwDOOwjHjs4Cqtih"
      data-mapping="pathname"
      data-strict="0"
      data-reactions-enabled="1"
      data-emit-metadata="0"
      data-input-position="bottom"
      data-theme={getCurrentTheme()}
      data-lang="ko"
      data-loading="lazy"
      crossorigin="anonymous"
      async
    ></script>
  </div>
{/if}

<style>
  .giscus-container {
    margin-top: 2rem;
  }
  
  :global(.giscus-frame) {
    transition: opacity 0.2s ease-in-out;
    width: 100% !important;
  }
  
  /* Giscus 내부 스타일 조정 */
  :global(.giscus-frame) {
    color-scheme: light dark;
  }
</style>

<script lang="ts">
import type { SearchResult } from "@/global";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import Icon from "@iconify/svelte";
import { url } from "@utils/url-utils.ts";
import { onMount } from "svelte";

let keywordDesktop = "";
let keywordMobile = "";
let result: SearchResult[] = [];
let isSearching = false;
let pagefindLoaded = false;
let searchPanelRef: HTMLElement | null = null;

// Debounce utility with requestAnimationFrame
function debounce<T extends (...args: unknown[]) => unknown>(func: T, wait: number): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout> | null = null;
	let rafId: number | null = null;
	return (...args: Parameters<T>) => {
		if (timeout) {
			clearTimeout(timeout);
		}
		if (rafId) {
			cancelAnimationFrame(rafId);
		}
		timeout = setTimeout(() => {
			rafId = requestAnimationFrame(() => func(...args));
		}, wait);
	};
}

const fakeResult: SearchResult[] = [
	{
		url: url("/"),
		meta: {
			title: "This Is a Fake Search Result",
		},
		excerpt: "Because the search cannot work in the <mark>dev</mark> environment.",
	},
	{
		url: url("/"),
		meta: {
			title: "If You Want to Test the Search",
		},
		excerpt: "Try running <mark>npm build && npm preview</mark> instead.",
	},
];

const togglePanel = () => {
	if (!searchPanelRef) {
		searchPanelRef = document.getElementById("search-panel");
	}
	requestAnimationFrame(() => {
		searchPanelRef?.classList.toggle("float-panel-closed");
	});
};

const setPanelVisibility = (show: boolean, isDesktop: boolean): void => {
	if (!searchPanelRef) {
		searchPanelRef = document.getElementById("search-panel");
	}
	if (!searchPanelRef || !isDesktop) {
		return;
	}

	requestAnimationFrame(() => {
		if (show) {
			searchPanelRef?.classList.remove("float-panel-closed");
		} else {
			searchPanelRef?.classList.add("float-panel-closed");
		}
	});
};

const searchImpl = async (keyword: string, isDesktop: boolean): Promise<void> => {
	if (!keyword) {
		setPanelVisibility(false, isDesktop);
		result = [];
		return;
	}

	isSearching = true;

	try {
		let searchResults: SearchResult[] = [];

		// Production에서는 pagefind가 동적으로 로드되므로 window.pagefind를 다시 확인
		if (import.meta.env.PROD) {
			// pagefind가 아직 로드되지 않았으면 다시 확인
			if (!pagefindLoaded && window.pagefind) {
				pagefindLoaded = true;
			}

			if (pagefindLoaded && window.pagefind) {
				const response = await window.pagefind.search(keyword);
				searchResults = await Promise.all(response.results.map((item) => item.data()));
			} else {
				// Production이지만 pagefind가 아직 로드되지 않은 경우
				console.warn("Pagefind not loaded yet");
				searchResults = [];
			}
		} else {
			// Development 환경
			searchResults = fakeResult;
		}

		result = searchResults;
		setPanelVisibility(result.length > 0, isDesktop);
	} catch (error) {
		console.error("Search error:", error);
		result = [];
		setPanelVisibility(false, isDesktop);
	} finally {
		isSearching = false;
	}
};

// Debounced search functions
const searchDesktop = debounce((keyword: string) => searchImpl(keyword, true), 300);
const searchMobile = debounce((keyword: string) => searchImpl(keyword, false), 300);

onMount(async () => {
	// Production 환경에서 pagefind 로드 대기
	if (import.meta.env.PROD) {
		// pagefind가 로드될 때까지 대기 (최대 5초)
		let checkCount = 0;
		const checkPagefind = setInterval(() => {
			if (window.pagefind || checkCount > 50) {
				clearInterval(checkPagefind);
				pagefindLoaded = !!window.pagefind;
				if (pagefindLoaded) {
					console.info("Pagefind loaded successfully");
				}
			}
			checkCount++;
		}, 100);
	}

	if (import.meta.env.DEV) {
		console.info("Development mode - using fake results");
	}

	// Fix search panel position on mobile
	if (window.innerWidth < 768) {
		const panel = document.getElementById("search-panel");
		if (panel) {
			// Move panel to body to avoid transform issues
			document.body.appendChild(panel);
		}
	}
});

// Watch for keyword changes and trigger debounced search
$: keywordDesktop && searchDesktop(keywordDesktop);
$: keywordMobile && searchMobile(keywordMobile);

// Clear results when keywords are empty
$: if (!keywordDesktop) {
	result = [];
	setPanelVisibility(false, true);
}
$: if (!keywordMobile) {
	result = [];
	setPanelVisibility(false, false);
}
</script>

<!-- search bar for desktop view -->
<div id="search-bar" class="hidden lg:flex transition-all items-center h-11 mr-2 rounded-lg
      bg-black/[0.04] hover:bg-black/[0.06] focus-within:bg-black/[0.06]
      dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10
" style="will-change: background-color;">
    <Icon icon="material-symbols:search" class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30"></Icon>
    <input placeholder="{i18n(I18nKey.search)}" bind:value={keywordDesktop} on:focus={() => searchImpl(keywordDesktop, true)}
           class="transition-all pl-10 text-sm bg-transparent outline-0
         h-full w-40 active:w-60 focus:w-60 text-black/50 dark:text-white/50"
    >
</div>

<!-- toggle btn for phone/tablet view -->
<button on:click={togglePanel} aria-label="Search Panel" id="search-switch"
        class="btn-plain scale-animation lg:!hidden rounded-lg w-11 h-11 active:scale-90">
    <Icon icon="material-symbols:search" class="text-[1.25rem]"></Icon>
</button>

<!-- search panel -->
<div id="search-panel" class="float-panel float-panel-closed search-panel fixed md:absolute md:w-[30rem]
left-2 right-2 md:left-[unset] md:right-4 top-20 shadow-2xl rounded-2xl p-2" style="will-change: transform, opacity;">

    <!-- search bar inside panel for phone/tablet -->
    <div id="search-bar-inside" class="flex relative lg:hidden transition-all items-center h-11 rounded-xl
      bg-black/[0.04] hover:bg-black/[0.06] focus-within:bg-black/[0.06]
      dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10
  ">
        <Icon icon="material-symbols:search" class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30"></Icon>
        <input placeholder="Search" bind:value={keywordMobile}
               class="pl-10 pr-3 absolute inset-0 text-base bg-transparent outline-0 w-full
               text-black/50 dark:text-white/50"
        >
    </div>

    <!-- search results -->
    {#each result as item}
        <a href={item.url}
           class="transition first-of-type:mt-2 lg:first-of-type:mt-0 group block
       rounded-xl text-lg px-3 py-2 hover:bg-[var(--btn-plain-bg-hover)] active:bg-[var(--btn-plain-bg-active)]">
            <div class="transition text-90 inline-flex font-bold group-hover:text-[var(--primary)]">
                {item.meta.title}<Icon icon="fa6-solid:chevron-right" class="transition text-[0.75rem] translate-x-1 my-auto text-[var(--primary)]"></Icon>
            </div>
            <div class="transition text-sm text-50">
                {@html item.excerpt}
            </div>
        </a>
    {/each}
</div>

<style>
  input:focus {
    outline: 0;
  }
  .search-panel {
    max-height: calc(100vh - 100px);
    overflow-y: auto;
  }
</style>

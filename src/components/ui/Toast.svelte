<script>
	import { onMount, onDestroy } from "svelte";
	import { fade, fly } from "svelte/transition";

	export let message = "";
	export let type = "success"; // success, error, info, warning
	export let duration = 3000;
	export let position = "bottom-center"; // top-left, top-center, top-right, bottom-left, bottom-center, bottom-right

	let visible = true;
	let timeoutId;

	// 아이콘 매핑
	const icons = {
		success: "✓",
		error: "✕",
		info: "ℹ",
		warning: "⚠",
	};

	// 색상 매핑
	const colors = {
		success: "#10b981",
		error: "#ef4444",
		info: "#3b82f6",
		warning: "#f59e0b",
	};

	onMount(() => {
		if (duration > 0) {
			timeoutId = setTimeout(() => {
				visible = false;
			}, duration);
		}
	});

	onDestroy(() => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
	});

	function handleClose() {
		visible = false;
	}

	// 위치 클래스 계산
	function getPositionClass() {
		const positions = {
			"top-left": "top-4 left-4",
			"top-center": "top-4 left-1/2 -translate-x-1/2",
			"top-right": "top-4 right-4",
			"bottom-left": "bottom-4 left-4",
			"bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
			"bottom-right": "bottom-4 right-4",
		};
		return positions[position] || positions["bottom-center"];
	}

	// 애니메이션 방향 계산
	function getTransition() {
		if (position.includes("top")) {
			return { y: -100 };
		}
		return { y: 100 };
	}
</script>

{#if visible}
	<div
		class="toast-container fixed z-50 {getPositionClass()}"
		transition:fly={getTransition()}
	>
		<div
			class="toast flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm"
			style="background-color: {colors[type]}; color: white;"
			transition:fade={{ duration: 200 }}
		>
			<span class="icon text-xl">{icons[type]}</span>
			<span class="message flex-1">{message}</span>
			<button
				class="close-btn ml-2 hover:opacity-80 transition-opacity"
				on:click={handleClose}
				aria-label="닫기"
			>
				✕
			</button>
		</div>
	</div>
{/if}

<style>
	.toast {
		min-width: 250px;
		max-width: 500px;
		animation: slideIn 0.3s ease-out;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: scale(0.9);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.close-btn {
		background: none;
		border: none;
		color: inherit;
		cursor: pointer;
		padding: 4px;
		font-size: 14px;
		line-height: 1;
	}

	@media (max-width: 640px) {
		.toast-container {
			left: 1rem !important;
			right: 1rem !important;
			transform: none !important;
		}

		.toast {
			width: 100%;
			max-width: none;
		}
	}
</style>

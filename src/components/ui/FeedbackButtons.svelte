<script>
import { createEventDispatcher } from "svelte";

export let messageId;
export let currentFeedback = 0; // 1: 좋아요, -1: 싫어요, 0: 없음
export let disabled = false;

const dispatch = createEventDispatcher();

function handleThumbsUp() {
	if (disabled) {
		return;
	}
	const newValue = currentFeedback === 1 ? 0 : 1;
	dispatch("feedback", { messageId, value: newValue });
}

function handleThumbsDown() {
	if (disabled) {
		return;
	}
	const newValue = currentFeedback === -1 ? 0 : -1;
	dispatch("feedback", { messageId, value: newValue });
}
</script>

<div class="feedback-buttons">
	<button
		class="feedback-btn thumbs-up"
		class:active={currentFeedback === 1}
		on:click={handleThumbsUp}
		disabled={disabled}
		title={currentFeedback === 1 ? "좋아요 취소" : "좋아요"}
		aria-label={currentFeedback === 1 ? "좋아요 취소" : "좋아요"}
	>
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill={currentFeedback === 1 ? "currentColor" : "none"}
			stroke="currentColor"
			stroke-width="2"
		>
			<path
				d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"
			/>
		</svg>
		{#if currentFeedback === 1}
			<span class="feedback-count">도움됨</span>
		{/if}
	</button>

	<button
		class="feedback-btn thumbs-down"
		class:active={currentFeedback === -1}
		on:click={handleThumbsDown}
		disabled={disabled}
		title={currentFeedback === -1 ? "싫어요 취소" : "싫어요"}
		aria-label={currentFeedback === -1 ? "싫어요 취소" : "싫어요"}
	>
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill={currentFeedback === -1 ? "currentColor" : "none"}
			stroke="currentColor"
			stroke-width="2"
		>
			<path
				d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"
			/>
		</svg>
		{#if currentFeedback === -1}
			<span class="feedback-count">개선필요</span>
		{/if}
	</button>
</div>

<style>
	.feedback-buttons {
		display: flex;
		gap: 8px;
		margin-top: 8px;
		opacity: 0.6;
		transition: opacity 0.2s;
	}

	.feedback-buttons:hover {
		opacity: 1;
	}

	.feedback-btn {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 6px 10px;
		background: transparent;
		border: 1px solid #e0e0e0;
		border-radius: 6px;
		cursor: pointer;
		color: #666;
		font-size: 12px;
		transition: all 0.2s;
		position: relative;
		overflow: hidden;
	}

	.feedback-btn::before {
		content: "";
		position: absolute;
		top: 50%;
		left: 50%;
		width: 0;
		height: 0;
		background: radial-gradient(circle, rgba(74, 144, 226, 0.1) 0%, transparent 70%);
		transform: translate(-50%, -50%);
		transition: width 0.3s, height 0.3s;
		border-radius: 50%;
	}

	.feedback-btn:hover::before {
		width: 100px;
		height: 100px;
	}

	.feedback-btn:hover:not(:disabled) {
		border-color: #4a90e2;
		color: #4a90e2;
		background-color: rgba(74, 144, 226, 0.05);
	}

	.feedback-btn:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.feedback-btn svg {
		width: 16px;
		height: 16px;
		transition: transform 0.2s;
	}

	.feedback-btn:hover:not(:disabled) svg {
		transform: scale(1.1);
	}

	.feedback-btn.active {
		background-color: rgba(74, 144, 226, 0.1);
		border-color: #4a90e2;
		color: #4a90e2;
	}

	.thumbs-up.active {
		background-color: rgba(16, 185, 129, 0.1);
		border-color: #10b981;
		color: #10b981;
	}

	.thumbs-down.active {
		background-color: rgba(239, 68, 68, 0.1);
		border-color: #ef4444;
		color: #ef4444;
	}

	.feedback-count {
		font-weight: 500;
		white-space: nowrap;
	}

	/* 애니메이션 효과 */
	@keyframes thumbsUpAnimation {
		0% {
			transform: translateY(0) rotate(0);
		}
		25% {
			transform: translateY(-3px) rotate(-5deg);
		}
		50% {
			transform: translateY(-5px) rotate(5deg);
		}
		75% {
			transform: translateY(-3px) rotate(-5deg);
		}
		100% {
			transform: translateY(0) rotate(0);
		}
	}

	.feedback-btn.active svg {
		animation: thumbsUpAnimation 0.5s ease;
	}

	@media (max-width: 480px) {
		.feedback-btn {
			padding: 4px 8px;
			font-size: 11px;
		}

		.feedback-btn svg {
			width: 14px;
			height: 14px;
		}
	}
</style>

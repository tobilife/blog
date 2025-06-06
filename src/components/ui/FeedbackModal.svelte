<script>
import { createEventDispatcher } from "svelte";
import { fade, scale } from "svelte/transition";

export let visible = false;
export let currentFeedback = 0; // 1: 좋아요, -1: 싫어요, 0: 없음

const dispatch = createEventDispatcher();

let comment = "";
let selectedReason = "";

// 피드백별 이유 옵션
const positiveReasons = [
	"정확한 답변",
	"도움이 되었음",
	"이해하기 쉬움",
	"빠른 응답",
	"기타",
];

const negativeReasons = [
	"부정확한 정보",
	"이해하기 어려움",
	"관련없는 답변",
	"응답이 느림",
	"기타",
];

$: reasons = currentFeedback > 0 ? positiveReasons : negativeReasons;

function handleSubmit() {
	dispatch("submit", {
		reason: selectedReason,
		comment: comment.trim(),
	});
	close();
}

function close() {
	visible = false;
	comment = "";
	selectedReason = "";
}

function handleBackdropClick(e) {
	if (e.target === e.currentTarget) {
		close();
	}
}
</script>

{#if visible}
	<div
		class="modal-backdrop"
		on:click={handleBackdropClick}
		on:keydown={(e) => e.key === "Escape" && close()}
		transition:fade={{ duration: 200 }}
	>
		<div
			class="modal-content"
			transition:scale={{ duration: 200, start: 0.9 }}
		>
			<div class="modal-header">
				<h3>
					{currentFeedback > 0 ? "👍 좋아요!" : "👎 아쉬워요"}
				</h3>
				<button class="close-btn" on:click={close} aria-label="닫기">
					✕
				</button>
			</div>

			<div class="modal-body">
				<p class="subtitle">
					{currentFeedback > 0
						? "어떤 점이 좋으셨나요?"
						: "어떤 점이 아쉬우셨나요?"}
				</p>

				<div class="reasons">
					{#each reasons as reason}
						<label class="reason-option">
							<input
								type="radio"
								name="reason"
								value={reason}
								bind:group={selectedReason}
							/>
							<span>{reason}</span>
						</label>
					{/each}
				</div>

				{#if selectedReason === "기타"}
					<textarea
						class="comment-input"
						placeholder="구체적인 의견을 남겨주세요..."
						bind:value={comment}
						rows="3"
					/>
				{/if}
			</div>

			<div class="modal-footer">
				<button class="btn btn-secondary" on:click={close}>
					취소
				</button>
				<button
					class="btn btn-primary"
					on:click={handleSubmit}
					disabled={!selectedReason}
				>
					제출
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10000;
		padding: 20px;
	}

	.modal-content {
		background: white;
		border-radius: 12px;
		max-width: 450px;
		width: 100%;
		max-height: 80vh;
		overflow: hidden;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20px;
		border-bottom: 1px solid #e5e7eb;
	}

	.modal-header h3 {
		margin: 0;
		font-size: 20px;
		font-weight: 600;
		color: #1f2937;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 24px;
		color: #6b7280;
		cursor: pointer;
		padding: 0;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
		transition: all 0.2s;
	}

	.close-btn:hover {
		background-color: #f3f4f6;
		color: #374151;
	}

	.modal-body {
		padding: 20px;
	}

	.subtitle {
		margin: 0 0 16px 0;
		color: #6b7280;
		font-size: 14px;
	}

	.reasons {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-bottom: 16px;
	}

	.reason-option {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.reason-option:hover {
		background-color: #f9fafb;
		border-color: #d1d5db;
	}

	.reason-option input[type="radio"] {
		width: 18px;
		height: 18px;
		margin: 0;
		cursor: pointer;
		accent-color: #4a90e2;
	}

	.reason-option span {
		flex: 1;
		color: #374151;
		font-size: 14px;
	}

	.comment-input {
		width: 100%;
		padding: 12px;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		resize: vertical;
		font-family: inherit;
		font-size: 14px;
		transition: border-color 0.2s;
	}

	.comment-input:focus {
		outline: none;
		border-color: #4a90e2;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		padding: 20px;
		border-top: 1px solid #e5e7eb;
		background-color: #f9fafb;
	}

	.btn {
		padding: 10px 20px;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		border: none;
		outline: none;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-secondary {
		background-color: white;
		color: #374151;
		border: 1px solid #d1d5db;
	}

	.btn-secondary:hover:not(:disabled) {
		background-color: #f3f4f6;
		border-color: #9ca3af;
	}

	.btn-primary {
		background-color: #4a90e2;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background-color: #357abd;
	}

	@media (max-width: 480px) {
		.modal-content {
			max-height: 90vh;
		}

		.modal-header {
			padding: 16px;
		}

		.modal-body {
			padding: 16px;
		}

		.modal-footer {
			padding: 16px;
		}
	}
</style>

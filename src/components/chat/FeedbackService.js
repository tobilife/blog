// Feedback Service for Chat Messages
export class FeedbackService {
	constructor() {
		this.FEEDBACK_API_URL = "/.netlify/functions/update-feedback";
		this.feedbackCache = new Map(); // 로컬 캐시로 중복 요청 방지
	}

	/**
	 * 피드백 제출
	 * @param {string} cacheKey - 캐시 키
	 * @param {number} feedback - 피드백 값 (1: 좋아요, -1: 싫어요, 0: 중립)
	 * @param {string} comment - 추가 코멘트 (선택사항)
	 * @returns {Promise<Object>} 업데이트 결과
	 */
	async submitFeedback(cacheKey, feedback, comment = null) {
		try {
			// 중복 제출 방지
			const cachedFeedback = this.feedbackCache.get(cacheKey);
			if (cachedFeedback === feedback) {
				return { success: true, message: "이미 제출된 피드백입니다." };
			}

			const response = await fetch(this.FEEDBACK_API_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					cacheKey,
					feedback,
					comment,
					timestamp: new Date().toISOString(),
				}),
			});

			if (!response.ok) {
				throw new Error("피드백 제출 실패");
			}

			const result = await response.json();

			// 로컬 캐시 업데이트
			this.feedbackCache.set(cacheKey, feedback);

			return {
				success: true,
				...result,
			};
		} catch (error) {
			console.error("Feedback submission error:", error);
			return {
				success: false,
				error: error.message,
			};
		}
	}

	/**
	 * 피드백 취소
	 * @param {string} cacheKey - 캐시 키
	 * @returns {Promise<Object>} 취소 결과
	 */
	async cancelFeedback(cacheKey) {
		return this.submitFeedback(cacheKey, 0);
	}

	/**
	 * 품질 점수 계산
	 * @param {number} userFeedback - 사용자 피드백 합계
	 * @param {number} feedbackCount - 피드백 수
	 * @returns {number} 계산된 품질 점수 (0-100)
	 */
	calculateQualityScore(userFeedback, feedbackCount) {
		if (feedbackCount === 0) return 50; // 기본값

		// 평균 피드백 점수 (-1 ~ 1 범위)
		const avgFeedback = userFeedback / feedbackCount;

		// 0-100 스케일로 변환
		const baseScore = (avgFeedback + 1) * 50;

		// 피드백 수에 따른 신뢰도 가중치
		const confidenceWeight = Math.min(feedbackCount / 10, 1);

		// 최종 점수 (기본값과 실제 점수의 가중 평균)
		return Math.round(
			baseScore * confidenceWeight + 50 * (1 - confidenceWeight),
		);
	}

	/**
	 * 신뢰도 레벨 결정
	 * @param {number} qualityScore - 품질 점수
	 * @param {number} feedbackCount - 피드백 수
	 * @returns {string} 신뢰도 레벨
	 */
	getConfidenceLevel(qualityScore, feedbackCount) {
		if (feedbackCount < 3) return "low";
		if (qualityScore >= 80 && feedbackCount >= 10) return "high";
		if (qualityScore >= 60 && feedbackCount >= 5) return "medium";
		return "low";
	}

	/**
	 * 캐시된 피드백 가져오기
	 * @param {string} cacheKey - 캐시 키
	 * @returns {number|null} 피드백 값
	 */
	getCachedFeedback(cacheKey) {
		return this.feedbackCache.get(cacheKey) || null;
	}

	/**
	 * 피드백 통계 포맷팅
	 * @param {Object} stats - 피드백 통계
	 * @returns {string} 포맷된 텍스트
	 */
	formatFeedbackStats(stats) {
		const { qualityScore, feedbackCount, confidenceLevel } = stats;
		const emoji = qualityScore >= 80 ? "😊" : qualityScore >= 60 ? "😐" : "😕";

		return `품질 점수: ${qualityScore}/100 ${emoji} (${feedbackCount}명 평가, 신뢰도: ${confidenceLevel})`;
	}
}

export default FeedbackService;

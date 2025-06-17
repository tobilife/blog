// OG 이미지 생성을 위한 설정
export const ogImageConfig = {
	default: {
		width: 1200,
		height: 630,
		background: "#ffffff",
		titleColor: "#1a1a1a",
		subtitleColor: "#666666",
		font: "Pretendard",
		logo: "/images/tobilife.webp",
	},
	article: {
		width: 1200,
		height: 630,
		background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
		titleColor: "#ffffff",
		subtitleColor: "#e0e0e0",
		font: "Pretendard",
	},
};

// 이미지 최적화 설정
export const imageOptimizationConfig = {
	// WebP 변환 설정
	webp: {
		quality: 85,
		effort: 4,
	},
	// 썸네일 크기 설정
	thumbnails: {
		small: { width: 320, height: 180 },
		medium: { width: 640, height: 360 },
		large: { width: 1200, height: 630 },
	},
	// 반응형 이미지 설정
	responsive: {
		sizes: [320, 640, 768, 1024, 1200, 1920],
		formats: ["webp", "jpg"],
	},
};

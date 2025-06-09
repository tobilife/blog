/**
 * Search Prompt Builder
 * 검색 결과를 LLM이 더 잘 이해하고 답변할 수 있도록 프롬프트 구성
 */

/**
 * 검색이 필요한 질문에 대한 시스템 프롬프트 생성
 */
export function buildSearchPrompt(query, classification) {
	const prompts = [];

	// 기본 검색 지시
	prompts.push(getBaseSearchInstruction());

	// 도메인별 특화 지시
	if (classification.domains.length > 0) {
		prompts.push(getDomainSpecificInstructions(classification.domains));
	}

	// 의도별 특화 지시
	if (classification.reasons.length > 0) {
		prompts.push(getIntentSpecificInstructions(classification.reasons));
	}

	// 답변 형식 지시
	prompts.push(getResponseFormatInstruction(query, classification));

	return prompts.join("\n\n");
}

function getBaseSearchInstruction() {
	return `[웹 검색 기반 답변 지침]
- 사용자의 질문에 대해 최신 정보를 검색하여 정확하게 답변하세요
- 검색 결과를 종합하여 신뢰할 수 있는 정보만 제공하세요
- 정보의 출처나 날짜가 중요한 경우 명시하세요
- 검색 결과가 없거나 불충분한 경우 솔직하게 알려주세요`;
}

function getDomainSpecificInstructions(domains) {
	const instructions = {
		weather: `[날씨 정보 답변 지침]
- 구체적인 지역의 현재 날씨와 예보를 제공하세요
- 온도, 습도, 강수 확률 등 주요 정보를 포함하세요
- 특별한 기상 상황(태풍, 폭우 등)이 있다면 강조하세요`,

		financial: `[금융 정보 답변 지침]
- 실시간 시세나 가격 정보를 정확히 제공하세요
- 변동률과 함께 이전 대비 증감을 표시하세요
- 금융 조언이 아닌 객관적 정보만 제공하세요`,

		news: `[뉴스 정보 답변 지침]
- 최신 뉴스를 시간순으로 정리하여 제공하세요
- 핵심 내용을 요약하고 출처를 명시하세요
- 다양한 관점이 있는 경우 균형있게 전달하세요`,

		tech: `[기술 정보 답변 지침]
- 기술적 내용을 이해하기 쉽게 설명하세요
- 최신 동향과 함께 실용적인 정보를 제공하세요
- 전문 용어는 필요시 쉽게 풀어서 설명하세요`,

		health: `[건강 정보 답변 지침]
- 의학적 정보는 신중하게 전달하세요
- 일반적인 정보 제공에 그치고 진단이나 처방은 하지 마세요
- 필요시 전문의 상담을 권하세요`,

		sports: `[스포츠 정보 답변 지침]
- 경기 결과와 순위를 명확히 제공하세요
- 주요 선수나 팀의 성적을 포함하세요
- 관련 통계나 기록이 있다면 함께 제공하세요`,

		entertainment: `[엔터테인먼트 정보 답변 지침]
- 최신 작품이나 공연 정보를 제공하세요
- 평점이나 리뷰가 있다면 참고로 제공하세요
- 관련 일정이나 예매 정보도 포함할 수 있습니다`,

		travel: `[여행 정보 답변 지침]
- 실용적인 여행 정보를 제공하세요
- 현지 상황이나 주의사항을 포함하세요
- 비용이나 소요 시간 등 구체적 정보를 제공하세요`,

		shopping: `[쇼핑 정보 답변 지침]
- 가격 비교 정보를 제공하세요
- 제품 사양이나 특징을 명확히 설명하세요
- 구매처나 할인 정보가 있다면 포함하세요`,

		education: `[교육 정보 답변 지침]
- 정확한 입시나 시험 정보를 제공하세요
- 학습 방법이나 전략을 포함할 수 있습니다
- 관련 일정이나 마감일을 명시하세요`,

		legal: `[법률 정보 답변 지침]
- 일반적인 법률 정보만 제공하세요
- 구체적인 법률 자문은 피하세요
- 필요시 전문가 상담을 권하세요`,

		food: `[음식 정보 답변 지침]
- 레시피는 단계별로 명확히 설명하세요
- 재료와 분량을 정확히 제공하세요
- 맛집 정보는 위치와 영업시간을 포함하세요`,
	};

	const selectedInstructions = domains
		.map((domain) => instructions[domain])
		.filter(Boolean)
		.join("\n\n");

	return selectedInstructions || "";
}

function getIntentSpecificInstructions(reasons) {
	const instructions = [];

	if (reasons.some((r) => r.includes("팩트 체크"))) {
		instructions.push(`[팩트 체크 지침]
- 여러 출처를 교차 검증하여 정확성을 확인하세요
- 논란이 있는 정보는 다양한 관점을 제시하세요
- 확인되지 않은 정보는 명확히 표시하세요`);
	}

	if (reasons.some((r) => r.includes("비교"))) {
		instructions.push(`[비교 답변 지침]
- 비교 대상의 주요 차이점을 명확히 정리하세요
- 장단점을 객관적으로 제시하세요
- 표나 리스트 형식으로 보기 쉽게 정리하세요`);
	}

	if (reasons.some((r) => r.includes("통계"))) {
		instructions.push(`[통계 정보 지침]
- 정확한 수치와 출처를 제공하세요
- 필요시 그래프나 차트 형태로 설명하세요
- 데이터의 시점과 범위를 명시하세요`);
	}

	return instructions.join("\n\n");
}

function getResponseFormatInstruction(query, _classification) {
	let format = `[답변 형식]
- 친근하고 자연스러운 한국어로 답변하세요
- 핵심 정보를 먼저 제공하고 부가 설명을 추가하세요`;

	// 특수한 형식이 필요한 경우
	if (query.includes("목록") || query.includes("리스트")) {
		format += "\n- 번호나 글머리 기호를 사용한 목록 형식으로 정리하세요";
	}

	if (query.includes("요약") || query.includes("간단히")) {
		format += "\n- 핵심만 간단명료하게 요약하세요";
	}

	if (query.includes("자세히") || query.includes("상세히")) {
		format += "\n- 충분한 설명과 예시를 포함하여 상세히 답변하세요";
	}

	return format;
}

/**
 * 검색 결과를 포함한 최종 프롬프트 생성
 */
export function buildFinalPrompt(query, classification, searchResults) {
	const parts = [];

	// 1. 시스템 지시사항
	parts.push(buildSearchPrompt(query, classification));

	// 2. 검색 결과 컨텍스트
	if (searchResults && searchResults.length > 0) {
		parts.push("\n[검색 결과]");
		searchResults.forEach((result, index) => {
			parts.push(`\n${index + 1}. ${result.title || "제목 없음"}`);
			if (result.snippet) {
				parts.push(`   내용: ${result.snippet}`);
			}
			if (result.url) {
				parts.push(`   출처: ${result.url}`);
			}
		});
	}

	// 3. 원본 질문
	parts.push(`\n[사용자 질문]\n${query}`);

	// 4. 추가 지시사항
	parts.push(`\n[추가 지시사항]
- 위의 검색 결과를 참고하여 사용자의 질문에 답변하세요
- 검색 결과에 없는 내용은 추측하지 말고 모른다고 답변하세요
- 정보가 최신인지 확인하고, 필요시 날짜를 명시하세요`);

	return parts.join("\n");
}

/**
 * 검색이 필요없는 일반 대화용 프롬프트
 */
export function buildChatPrompt(query) {
	return `[일반 대화 지침]
- 친근하고 도움이 되는 AI 어시스턴트로서 답변하세요
- 사용자의 감정과 의도를 이해하고 공감하며 대화하세요
- 정확한 정보와 유용한 조언을 제공하세요

[사용자 메시지]
${query}`;
}

/**
 * 한국어 NLP 유틸리티
 * 브라우저 환경에서 동작하는 간단한 한국어 형태소 분석기
 */

export class KoreanNLPService {
	constructor() {
		// 한국어 조사 패턴
		this.josaPatterns = {
			// 주격 조사
			subject: ["이", "가", "께서", "에서"],
			// 보조사
			topic: ["은", "는"],
			// 목적격 조사
			object: ["을", "를"],
			// 부사격 조사
			adverb: ["에", "에서", "에게", "한테", "께"],
			// 관형격 조사
			possessive: ["의"],
			// 접속 조사
			conjunction: ["와", "과", "하고", "이나", "나", "이며", "며"],
		};

		// 의미있는 접미사
		this.suffixes = [
			"님",
			"씨",
			"들",
			"만",
			"까지",
			"부터",
			"마다",
			"처럼",
			"같이",
		];

		// 복합 명사를 인식하기 위한 패턴
		this.compoundNounPatterns = [
			/인공지능/,
			/머신러닝/,
			/딥러닝/,
			/빅데이터/,
			/스마트폰/,
			/노트북/,
			/태블릿/,
			/컴퓨터/,
			/소프트웨어/,
			/하드웨어/,
			/네트워크/,
			/데이터베이스/,
			/코로나19/,
			/코로나바이러스/,
			/팬데믹/,
			/부동산/,
			/아파트/,
			/주식시장/,
			/증권거래소/,
			/대통령/,
			/국회의원/,
			/시장/,
			/도지사/,
			/날씨/,
			/미세먼지/,
			/황사/,
			/태풍/,
			/올림픽/,
			/월드컵/,
			/아시안게임/,
		];

		// 의문사 패턴
		this.questionWords = {
			what: ["뭐", "무엇", "무슨", "어떤", "어느"],
			who: ["누구", "누가", "누굴", "누구를"],
			when: ["언제", "몇시", "며칠"],
			where: ["어디", "어디서", "어디로", "어디에"],
			why: ["왜", "어째서", "무슨이유로"],
			how: ["어떻게", "어찌", "얼마나", "얼마"],
		};
	}

	/**
	 * 간단한 토크나이저
	 */
	tokenize(text) {
		// 공백과 특수문자를 기준으로 분리하되, 의미있는 특수문자는 보존
		const tokens = [];
		let currentToken = "";

		for (let i = 0; i < text.length; i++) {
			const char = text[i];
			const charCode = char.charCodeAt(0);

			// 한글, 영문, 숫자인 경우
			if (
				(charCode >= 0xac00 && charCode <= 0xd7a3) || // 한글
				(charCode >= 0x41 && charCode <= 0x5a) || // 영문 대문자
				(charCode >= 0x61 && charCode <= 0x7a) || // 영문 소문자
				(charCode >= 0x30 && charCode <= 0x39) // 숫자
			) {
				currentToken += char;
			} else {
				// 토큰이 있으면 추가
				if (currentToken) {
					tokens.push(currentToken);
					currentToken = "";
				}
				// 의미있는 구분자도 토큰으로 추가
				if (char !== " " && char !== "\t" && char !== "\n") {
					tokens.push(char);
				}
			}
		}

		if (currentToken) {
			tokens.push(currentToken);
		}

		return tokens;
	}

	/**
	 * 조사 분리
	 */
	separateJosa(word) {
		// 가장 긴 조사부터 매칭 시도
		const allJosas = Object.values(this.josaPatterns).flat();
		allJosas.sort((a, b) => b.length - a.length);

		for (const josa of allJosas) {
			if (word.endsWith(josa)) {
				const stem = word.slice(0, -josa.length);
				if (stem.length > 0) {
					// 조사 타입 찾기
					let josaType = "other";
					for (const [type, josas] of Object.entries(this.josaPatterns)) {
						if (josas.includes(josa)) {
							josaType = type;
							break;
						}
					}
					return { stem, josa, josaType };
				}
			}
		}

		return { stem: word, josa: null, josaType: null };
	}

	/**
	 * 복합 명사 인식
	 */
	recognizeCompoundNouns(tokens) {
		const recognized = [];
		let i = 0;

		while (i < tokens.length) {
			let matched = false;

			// 미리 정의된 복합 명사 패턴 확인
			for (const pattern of this.compoundNounPatterns) {
				// 현재 위치부터 시작하는 텍스트 구성
				let text = "";
				for (let j = i; j < Math.min(i + 4, tokens.length); j++) {
					text += tokens[j];
					if (pattern.test(text)) {
						recognized.push({
							text: text,
							type: "compound_noun",
							start: i,
							end: j,
						});
						i = j + 1;
						matched = true;
						break;
					}
				}
				if (matched) break;
			}

			// 연속된 명사를 복합 명사로 인식
			if (!matched) {
				const nounSequence = [];
				let j = i;
				while (j < tokens.length && this.isLikelyNoun(tokens[j])) {
					nounSequence.push(tokens[j]);
					j++;
				}

				if (nounSequence.length > 1) {
					recognized.push({
						text: nounSequence.join(""),
						type: "compound_noun",
						start: i,
						end: j - 1,
					});
					i = j;
				} else if (nounSequence.length === 1) {
					recognized.push({
						text: nounSequence[0],
						type: "noun",
						start: i,
						end: i,
					});
					i++;
				} else {
					recognized.push({
						text: tokens[i],
						type: "other",
						start: i,
						end: i,
					});
					i++;
				}
			}
		}

		return recognized;
	}

	/**
	 * 명사일 가능성이 높은지 판단
	 */
	isLikelyNoun(token) {
		// 한글로만 구성되어 있고, 1글자 이상인 경우
		if (!/^[가-힣]+$/.test(token)) return false;
		if (token.length < 1) return false;

		// 조사나 접미사가 아닌 경우
		const allJosas = Object.values(this.josaPatterns).flat();
		if (allJosas.includes(token)) return false;
		if (this.suffixes.includes(token)) return false;

		// 의문사가 아닌 경우
		const allQuestionWords = Object.values(this.questionWords).flat();
		if (allQuestionWords.includes(token)) return false;

		return true;
	}

	/**
	 * 문장 분석
	 */
	analyzeQuery(query) {
		const tokens = this.tokenize(query);
		const recognizedTokens = this.recognizeCompoundNouns(tokens);
		const analysis = {
			tokens: recognizedTokens,
			subjects: [],
			objects: [],
			mainNouns: [],
			questionType: null,
			hasTemporalContext: false,
			hasSpatialContext: false,
		};

		// 토큰 분석
		for (let i = 0; i < recognizedTokens.length; i++) {
			const token = recognizedTokens[i];

			if (token.type === "noun" || token.type === "compound_noun") {
				// 다음 토큰이 조사인지 확인
				if (i + 1 < recognizedTokens.length) {
					const nextToken = recognizedTokens[i + 1];
					const josaInfo = this.separateJosa(nextToken.text);

					if (josaInfo.josa) {
						if (
							josaInfo.josaType === "subject" ||
							josaInfo.josaType === "topic"
						) {
							analysis.subjects.push({
								text: token.text,
								josaType: josaInfo.josaType,
								josa: josaInfo.josa,
							});
						} else if (josaInfo.josaType === "object") {
							analysis.objects.push({
								text: token.text,
								josaType: josaInfo.josaType,
								josa: josaInfo.josa,
							});
						}
					}
				}

				// 모든 명사를 mainNouns에 추가
				analysis.mainNouns.push(token.text);
			}

			// 의문사 체크
			for (const [type, words] of Object.entries(this.questionWords)) {
				if (words.includes(token.text)) {
					analysis.questionType = type;
					break;
				}
			}

			// 시간 관련 컨텍스트 체크
			if (/오늘|내일|어제|이번|다음|지난/.test(token.text)) {
				analysis.hasTemporalContext = true;
			}

			// 공간 관련 컨텍스트 체크
			if (/여기|거기|저기|이곳|그곳/.test(token.text)) {
				analysis.hasSpatialContext = true;
			}
		}

		return analysis;
	}

	/**
	 * 주요 주제어 추출 (개선된 버전)
	 */
	extractMainSubject(query) {
		const analysis = this.analyzeQuery(query);

		// 1. 주격/보조사가 붙은 명사 우선
		if (analysis.subjects.length > 0) {
			// 가장 구체적인 주어 선택 (복합 명사 우선)
			const sortedSubjects = analysis.subjects.sort(
				(a, b) => b.text.length - a.text.length,
			);
			return sortedSubjects[0].text;
		}

		// 2. 목적어가 있는 경우
		if (analysis.objects.length > 0) {
			const sortedObjects = analysis.objects.sort(
				(a, b) => b.text.length - a.text.length,
			);
			return sortedObjects[0].text;
		}

		// 3. 의문사에 따른 주제어 선택
		if (analysis.questionType && analysis.mainNouns.length > 0) {
			// 시간 관련 의문사면 시간이 아닌 명사 선택
			if (analysis.questionType === "when" && analysis.hasTemporalContext) {
				const nonTemporalNouns = analysis.mainNouns.filter(
					(noun) => !/오늘|내일|어제|이번|다음|지난/.test(noun),
				);
				if (nonTemporalNouns.length > 0) {
					return nonTemporalNouns[0];
				}
			}
		}

		// 4. 가장 긴 명사 (복합 명사일 가능성이 높음)
		if (analysis.mainNouns.length > 0) {
			const sortedNouns = analysis.mainNouns.sort(
				(a, b) => b.length - a.length,
			);
			return sortedNouns[0];
		}

		return null;
	}

	/**
	 * 검색 키워드 추출
	 */
	extractSearchKeywords(query) {
		const analysis = this.analyzeQuery(query);
		const keywords = new Set();

		// 모든 명사 추가
		for (const noun of analysis.mainNouns) {
		 keywords.add(noun);
		}
		
		// 주어와 목적어 추가
		for (const subj of analysis.subjects) {
		 keywords.add(subj.text);
		}
		for (const obj of analysis.objects) {
		 keywords.add(obj.text);
		}

		// 의문사 관련 키워드 추가
		if (analysis.questionType) {
			// 의문사에 따른 추가 키워드
			const questionKeywords = {
				what: ["정의", "개념", "의미"],
				who: ["인물", "사람", "누구"],
				when: ["시간", "날짜", "언제"],
				where: ["장소", "위치", "어디"],
				why: ["이유", "원인", "왜"],
				how: ["방법", "방식", "어떻게"],
			};

			if (questionKeywords[analysis.questionType]) {
				// questionKeywords[analysis.questionType].forEach(kw => keywords.add(kw));
			}
		}

		return Array.from(keywords);
	}
}

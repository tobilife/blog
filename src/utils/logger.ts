/**
 * 개발 환경에서만 동작하는 로거 유틸리티
 */

const isDev = import.meta.env.DEV || import.meta.env.MODE === "development";

export const logger = {
	info: (...args: any[]) => {
		if (isDev) {
			console.info(...args);
		}
	},
	log: (...args: any[]) => {
		if (isDev) {
			console.log(...args);
		}
	},
	warn: (...args: any[]) => {
		if (isDev) {
			console.warn(...args);
		}
	},
	error: (...args: any[]) => {
		// 에러는 항상 출력
		console.error(...args);
	},
	debug: (...args: any[]) => {
		if (isDev) {
			console.debug(...args);
		}
	},
};

// 글로벌 console 오버라이드 (선택적)
export function setupGlobalLogger() {
	if (typeof window !== "undefined") {
		const originalConsole = {
			info: console.info,
			log: console.log,
			warn: console.warn,
			debug: console.debug,
		};

		console.info = (...args: any[]) => {
			if (isDev) {
				originalConsole.info(...args);
			}
		};

		console.log = (...args: any[]) => {
			if (isDev) {
				originalConsole.log(...args);
			}
		};

		console.warn = (...args: any[]) => {
			if (isDev) {
				originalConsole.warn(...args);
			}
		};

		console.debug = (...args: any[]) => {
			if (isDev) {
				originalConsole.debug(...args);
			}
		};
	}
}

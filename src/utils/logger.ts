/**
 * 개발 환경에서만 동작하는 로거 유틸리티
 */

const isDev = import.meta.env.DEV || import.meta.env.MODE === "development";

export const logger = {
	info: (...args: unknown[]) => {
		if (isDev) {
			console.info(...args);
		}
	},
	log: (...args: unknown[]) => {
		if (isDev) {
			console.info(...args);
		}
	},
	warn: (...args: unknown[]) => {
		if (isDev) {
			console.warn(...args);
		}
	},
	error: (...args: unknown[]) => {
		// 에러는 항상 출력
		console.error(...args);
	},
	debug: (...args: unknown[]) => {
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

		console.info = (...args: unknown[]) => {
			if (isDev) {
				originalConsole.info(...args);
			}
		};

		console.log = (...args: unknown[]) => {
			if (isDev) {
				originalConsole.log(...args);
			}
		};

		console.warn = (...args: unknown[]) => {
			if (isDev) {
				originalConsole.warn(...args);
			}
		};

		console.debug = (...args: unknown[]) => {
			if (isDev) {
				originalConsole.debug(...args);
			}
		};
	}
}

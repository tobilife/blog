import type { LIGHT_DARK_MODE } from "@/types/config";
import { DARK_MODE } from "@constants/constants.ts";

export function getDefaultHue(): number {
	const fallback = "250";
	const configCarrier = document.getElementById("config-carrier");
	return Number.parseInt(configCarrier?.dataset.hue || fallback);
}

export function getHue(): number {
	try {
		const stored = localStorage.getItem("hue");
		if (stored) {
			const hue = Number.parseInt(stored, 10);
			// 유효한 hue 값인지 검증 (0-360)
			if (Number.isInteger(hue) && hue >= 0 && hue <= 360) {
				return hue;
			}
		}
	} catch (error) {
		console.warn("Failed to read hue from localStorage:", error);
	}
	return getDefaultHue();
}

export function setHue(hue: number): void {
	// hue 값 검증 (0-360 범위로 제한)
	const validHue = Math.max(0, Math.min(360, Math.round(hue)));
	try {
		localStorage.setItem("hue", String(validHue));
	} catch (error) {
		console.warn("Failed to save hue to localStorage:", error);
	}
	const r = document.querySelector(":root") as HTMLElement;
	if (!r) {
		return;
	}
	requestAnimationFrame(() => {
		r.style.setProperty("--hue", String(validHue));
	});
}

export function applyThemeToDocument(_theme: LIGHT_DARK_MODE): void {
	requestAnimationFrame(() => {
		// Always apply dark mode
		document.documentElement.classList.add("dark");
	});
}

export function setTheme(theme: LIGHT_DARK_MODE): void {
	try {
		localStorage.setItem("theme", theme);
	} catch (error) {
		console.warn("Failed to save theme to localStorage:", error);
	}
	applyThemeToDocument(theme);
}

export function getStoredTheme(): LIGHT_DARK_MODE {
	return DARK_MODE;
}

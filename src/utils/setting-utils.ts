import type { LIGHT_DARK_MODE } from "@/types/config";
import { DARK_MODE } from "@constants/constants.ts";

export function getDefaultHue(): number {
	const fallback = "250";
	const configCarrier = document.getElementById("config-carrier");
	return Number.parseInt(configCarrier?.dataset.hue || fallback);
}

export function getHue(): number {
	const stored = localStorage.getItem("hue");
	return stored ? Number.parseInt(stored) : getDefaultHue();
}

export function setHue(hue: number): void {
	localStorage.setItem("hue", String(hue));
	const r = document.querySelector(":root") as HTMLElement;
	if (!r) {
		return;
	}
	requestAnimationFrame(() => {
		r.style.setProperty("--hue", String(hue));
	});
}

export function applyThemeToDocument(_theme: LIGHT_DARK_MODE) {
	requestAnimationFrame(() => {
		// Always apply dark mode
		document.documentElement.classList.add("dark");
	});
}

export function setTheme(theme: LIGHT_DARK_MODE): void {
	localStorage.setItem("theme", theme);
	applyThemeToDocument(theme);
}

export function getStoredTheme(): LIGHT_DARK_MODE {
	return DARK_MODE;
}

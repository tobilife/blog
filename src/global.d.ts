import type { AstroIntegration } from "@swup/astro";

interface NetlifyIdentityUser {
	id: string;
	email: string;
	user_metadata?: {
		full_name?: string;
		avatar_url?: string;
		[key: string]: unknown;
	};
	app_metadata?: {
		provider?: string;
		roles?: string[];
		[key: string]: unknown;
	};
	created_at?: string;
	updated_at?: string;
	confirmed_at?: string;
	confirmation_sent_at?: string;
	recovery_sent_at?: string;
	email_change_sent_at?: string;
	role?: string;
}

declare global {
	interface Window {
		// type from '@swup/astro' is incorrect
		swup: AstroIntegration;
		pagefind: {
			search: (query: string) => Promise<{
				results: Array<{
					data: () => Promise<SearchResult>;
				}>;
			}>;
		};
		netlifyIdentity?: {
			on: (
				event: "init" | "login" | "logout" | "error" | "open" | "close",
				callback: (user?: NetlifyIdentityUser | null) => void,
			) => void;
			open: () => void;
			close: () => void;
			currentUser: () => NetlifyIdentityUser | null;
			logout: () => void;
			refresh: (force?: boolean) => Promise<NetlifyIdentityUser | null>;
			init: () => void;
		};
	}
}

interface SearchResult {
	url: string;
	meta: {
		title: string;
	};
	excerpt: string;
	content?: string;
	word_count?: number;
	filters?: Record<string, unknown>;
	anchors?: Array<{
		element: string;
		id: string;
		text: string;
		location: number;
	}>;
	weighted_locations?: Array<{
		weight: number;
		balanced_score: number;
		location: number;
	}>;
	locations?: number[];
	raw_content?: string;
	raw_url?: string;
	sub_results?: SearchResult[];
}

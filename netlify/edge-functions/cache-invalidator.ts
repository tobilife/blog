import type { Config, Context } from "https://edge.netlify.com";

interface MetadataInfo {
	version: string;
	lastUpdated: string;
	totalPosts: number;
}

interface CacheVersionEntry {
	metadata_version: string;
	last_checked: string;
	expires_at: string;
}

// Astra DB 캐시 버전 관리 클래스
class CacheVersionManager {
	private baseUrl: string;
	private token: string;
	private keyspace: string;

	constructor(baseUrl: string, token: string, keyspace: string) {
		this.baseUrl = baseUrl;
		this.token = token;
		this.keyspace = keyspace;
	}

	// 현재 캐시 버전 가져오기
	async getCurrentVersion(): Promise<string | null> {
		const url = `${this.baseUrl}/api/rest/v2/keyspaces/${this.keyspace}/cache_version/current`;

		try {
			const response = await fetch(url, {
				method: "GET",
				headers: {
					"X-Cassandra-Token": this.token,
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				if (response.status === 404) {
					return null;
				}
				throw new Error(`Version fetch error: ${response.status}`);
			}

			const result = await response.json();
			const data = result.data || [result];
			if (data && data.length > 0) {
				return data[0].metadata_version;
			}
			return null;
		} catch (error) {
			console.error("Get version error:", error);
			return null;
		}
	}

	// 캐시 버전 업데이트
	async updateVersion(newVersion: string): Promise<boolean> {
		const data = {
			metadata_version: newVersion,
			last_checked: new Date().toISOString(),
			expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24시간
		};

		const url = `${this.baseUrl}/api/rest/v2/keyspaces/${this.keyspace}/cache_version/current`;

		try {
			const response = await fetch(url, {
				method: "PUT",
				headers: {
					"X-Cassandra-Token": this.token,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			});

			return response.ok;
		} catch (error) {
			console.error("Update version error:", error);
			return false;
		}
	}

	// 모든 캐시 엔트리 무효화 (특정 버전 이전의 것들)
	async invalidateOldCaches(currentVersion: string): Promise<number> {
		// 캐시 테이블의 모든 엔트리를 가져와서 버전 체크
		// 실제로는 Astra DB의 제한으로 인해 전체 스캔이 어려울 수 있음
		// 대안: TTL을 짧게 설정하거나, 버전별 테이블 분리
		
		console.log(`Would invalidate caches older than version: ${currentVersion}`);
		// 구현은 Astra DB의 실제 스키마에 따라 달라집니다
		return 0;
	}
}

// 메타데이터 파일 읽기
async function fetchMetadata(): Promise<MetadataInfo | null> {
	try {
		const response = await fetch("https://blog.tobimind.com/posts-metadata.json");
		if (!response.ok) {
			throw new Error(`Failed to fetch metadata: ${response.status}`);
		}
		const data = await response.json();
		return {
			version: data.version,
			lastUpdated: data.lastUpdated,
			totalPosts: data.totalPosts,
		};
	} catch (error) {
		console.error("Error fetching metadata:", error);
		return null;
	}
}

export default async (request: Request, context: Context) => {
	const url = new URL(request.url);
	
	// /api/cache/check 엔드포인트에서만 작동
	if (url.pathname !== "/api/cache/check") {
		return context.next();
	}

	// 환경 변수
	const ASTRA_DB_REST_URL = Deno.env.get("ASTRA_DB_REST_URL");
	const ASTRA_DB_APPLICATION_TOKEN = Deno.env.get("ASTRA_DB_APPLICATION_TOKEN");
	const ASTRA_DB_KEYSPACE = Deno.env.get("ASTRA_DB_KEYSPACE");

	if (!ASTRA_DB_REST_URL || !ASTRA_DB_APPLICATION_TOKEN || !ASTRA_DB_KEYSPACE) {
		return new Response(JSON.stringify({ error: "Cache service not configured" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		// 버전 관리자 초기화
		const versionManager = new CacheVersionManager(
			ASTRA_DB_REST_URL,
			ASTRA_DB_APPLICATION_TOKEN,
			ASTRA_DB_KEYSPACE,
		);

		// 현재 메타데이터 버전 가져오기
		const metadata = await fetchMetadata();
		if (!metadata) {
			throw new Error("Failed to fetch metadata");
		}

		// 캐시된 버전 가져오기
		const cachedVersion = await versionManager.getCurrentVersion();

		// 버전 비교
		const needsInvalidation = !cachedVersion || cachedVersion !== metadata.version;

		if (needsInvalidation) {
			console.log(`Cache invalidation needed: ${cachedVersion} -> ${metadata.version}`);
			
			// 버전 업데이트
			await versionManager.updateVersion(metadata.version);
			
			// 기존 캐시 무효화 (선택적)
			// await versionManager.invalidateOldCaches(metadata.version);
		}

		return new Response(JSON.stringify({
			currentVersion: metadata.version,
			cachedVersion: cachedVersion,
			needsInvalidation: needsInvalidation,
			lastUpdated: metadata.lastUpdated,
			totalPosts: metadata.totalPosts,
		}), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "no-cache",
			},
		});

	} catch (error) {
		console.error("Cache check error:", error);
		return new Response(JSON.stringify({ 
			error: "Cache check failed",
			message: error.message,
		}), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};

export const config: Config = {
	path: "/api/cache/check",
};
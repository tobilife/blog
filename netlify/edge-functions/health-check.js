// Health check endpoint for monitoring
export default async (request, context) => {
	const url = new URL(request.url);
	
	// Only handle /health endpoint
	if (url.pathname !== "/health") {
		return context.next();
	}
	
	try {
		// Check if posts metadata is accessible
		const metadataResponse = await fetch("https://tobilife.netlify.app/posts-metadata.json");
		const metadataOk = metadataResponse.ok;
		
		const health = {
			status: "healthy",
			timestamp: new Date().toISOString(),
			checks: {
				metadata: metadataOk ? "ok" : "failed",
				edge_functions: "ok"
			},
			version: "1.0.0"
		};
		
		return new Response(JSON.stringify(health, null, 2), {
			status: 200,
			headers: {
				"content-type": "application/json",
				"cache-control": "no-cache, no-store, must-revalidate"
			}
		});
	} catch (error) {
		return new Response(JSON.stringify({
			status: "unhealthy",
			error: error.message,
			timestamp: new Date().toISOString()
		}, null, 2), {
			status: 503,
			headers: {
				"content-type": "application/json",
				"cache-control": "no-cache, no-store, must-revalidate"
			}
		});
	}
};

export const config = {
	path: "/health",
};

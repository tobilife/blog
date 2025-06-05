import type { Config, Context } from "https://edge.netlify.com";

export default async (request: Request, context: Context) => {
  console.log("Test Edge Function called");
  
  // CORS 헤더
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  // Preflight 요청 처리
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }

  try {
    // 환경 변수 체크
    const LANGFLOW_API_TOKEN = Deno.env.get("LANGFLOW_API_TOKEN");
    const hasToken = !!LANGFLOW_API_TOKEN;
    
    return new Response(
      JSON.stringify({
        message: "Edge Function is working",
        hasToken: hasToken,
        timestamp: new Date().toISOString(),
        method: request.method
      }),
      { 
        status: 200, 
        headers: { ...headers, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Test function error",
        message: error.message,
      }),
      { 
        status: 500, 
        headers: { ...headers, "Content-Type": "application/json" } 
      }
    );
  }
};

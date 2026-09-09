export default {
  async fetch(request: Request, env: { ASSETS: { fetch(request: Request): Promise<Response> } }): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path.startsWith("/api/")) {
      return Response.json(
        { error: "Layanan tidak ditemukan." },
        { status: 404, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } }
      );
    }
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || request.method !== "GET") return response;
    if (!request.headers.get("accept")?.includes("text/html")) return response;
    return env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
  },
};

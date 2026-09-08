import { buildBackendHeaders } from "@/lib/proxy-headers";

const BACKEND_ORIGIN = (
  process.env.ECHOMERE_BACKEND_ORIGIN ||
  "http://127.0.0.1:3001"
).replace(/\/$/, "");

const BACKEND_HOST = process.env.ECHOMERE_BACKEND_HOST;
const MAX_REQUEST_BODY_BYTES = 100 * 1024;

type RouteParams = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, { params }: RouteParams) {
  const { path } = await params;
  if (path.some((segment) => segment === "." || segment === ".." || segment.length > 256)) {
    return Response.json({ error: "Invalid API path" }, { status: 400 });
  }
  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(`/api/${path.map(encodeURIComponent).join("/")}`, BACKEND_ORIGIN);
  targetUrl.search = incomingUrl.search;

  const headers = buildBackendHeaders(request.headers, BACKEND_HOST);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BODY_BYTES) {
    return Response.json({ error: "Request body too large" }, { status: 413 });
  }

  const body = hasBody ? await request.arrayBuffer() : undefined;
  if (body && body.byteLength > MAX_REQUEST_BODY_BYTES) {
    return Response.json({ error: "Request body too large" }, { status: 413 });
  }

  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
    redirect: "manual",
    signal: request.signal,
  });

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");
  responseHeaders.set("cache-control", "no-store");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;

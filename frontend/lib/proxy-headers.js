const FORWARDED_REQUEST_HEADERS = [
  "accept",
  "access-control-request-headers",
  "access-control-request-method",
  "authorization",
  "content-type",
  "cookie",
  "origin",
  "referer",
  "sec-fetch-site",
  "user-agent",
];

/**
 * Build the complete header set sent by the same-origin frontend proxy.
 * Forwarding and hop-by-hop headers are intentionally absent.
 *
 * @param {Headers} incoming
 * @param {string | undefined} backendHost
 */
export function buildBackendHeaders(incoming, backendHost) {
  const outgoing = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = incoming.get(name);
    if (value) outgoing.set(name, value);
  }
  if (backendHost) outgoing.set("host", backendHost);
  return outgoing;
}

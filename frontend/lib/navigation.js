const INTERNAL_ORIGIN = "https://echomere.invalid";

/**
 * Only allow same-origin absolute paths for post-login and post-onboarding
 * navigation. This prevents protocol URLs and scheme-relative open redirects.
 *
 * @param {string | null | undefined} value
 * @param {string} fallback
 */
export function safeInternalPath(value, fallback) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }

  try {
    const parsed = new URL(value, INTERNAL_ORIGIN);
    if (parsed.origin !== INTERNAL_ORIGIN) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

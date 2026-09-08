/**
 * Ensure a profile has a displayable name.
 * If the user has set a name, use it; otherwise fall back to a default
 * based on the profile type so the UI never shows "未命名".
 */
export function ensureProfileName<T extends { name: string | null; type: string }>(
  profile: T,
): T {
  if (profile.name && profile.name.trim().length > 0) {
    return profile;
  }
  return {
    ...profile,
    name: profile.type === "self" ? "自己" : "他人",
  };
}

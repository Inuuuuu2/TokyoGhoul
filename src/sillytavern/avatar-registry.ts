/**
 * Avatar registry — maps `asset:<key>` sentinels stored in IndexedDB to
 * Vite-bundled URLs. Storing the resolved URL directly would rot across
 * builds (hash changes), so we keep a stable key in DB and resolve on render.
 */

import kooriAvatarUrl from '../assets/users/koori.png';

const ASSET_AVATARS: Record<string, string> = {
  koori: kooriAvatarUrl,
};

/** Resolve a UserProfile.avatar value to a usable src.
 *  - `asset:koori` → bundled URL
 *  - plain http(s)/data:/blob: URL → returned as-is
 *  - undefined / unknown asset key → undefined */
export function resolveAvatar(value?: string): string | undefined {
  if (!value) return undefined;
  if (value.startsWith('asset:')) {
    return ASSET_AVATARS[value.slice(6)];
  }
  return value;
}

/**
 * Recovery helpers for dynamic-import / CSS chunk-load failures.
 *
 * Vite code-splits routes into hashed chunks. A chunk can momentarily fail to
 * load — a transient network blip, a CDN edge miss, or (most commonly) a client
 * holding an old index.html across a deploy that has since rotated the asset
 * hashes. React surfaces this as a thrown error from React.lazy, which would
 * otherwise trip the top-level ErrorBoundary and show a scary debug screen on a
 * public, investor-facing site.
 *
 * Reloading the page fetches a fresh index.html (and therefore the current
 * chunk hashes), which resolves the overwhelming majority of these failures.
 * We cap the number of automatic reloads per session so a genuinely missing
 * asset can't trap the visitor in a reload loop.
 */

const RELOAD_COUNT_KEY = "chunk-reload-count";
const MAX_AUTO_RELOADS = 2;

/** Heuristic match for the various ways a failed chunk/CSS load surfaces. */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) {
    return false;
  }
  const err = error as { name?: string; message?: string };
  const haystack = `${err.name ?? ""} ${err.message ?? ""}`;
  return (
    /Unable to preload CSS/i.test(haystack) ||
    /Failed to fetch dynamically imported module/i.test(haystack) ||
    /error loading dynamically imported module/i.test(haystack) ||
    /Importing a module script failed/i.test(haystack) ||
    /ChunkLoadError/i.test(haystack) ||
    /Loading chunk \d+ failed/i.test(haystack) ||
    /Loading CSS chunk/i.test(haystack)
  );
}

function getReloadCount(): number {
  try {
    return Number(sessionStorage.getItem(RELOAD_COUNT_KEY) ?? "0") || 0;
  } catch {
    return 0;
  }
}

/**
 * Reload the page to recover from a chunk-load failure, unless we have already
 * reloaded MAX_AUTO_RELOADS times this session. Returns true if a reload was
 * triggered (the caller should stop rendering / bail out).
 */
export function attemptChunkReload(): boolean {
  if (getReloadCount() >= MAX_AUTO_RELOADS) {
    return false;
  }
  try {
    sessionStorage.setItem(RELOAD_COUNT_KEY, String(getReloadCount() + 1));
  } catch {
    // sessionStorage unavailable (private mode, etc.) — reload once anyway.
  }
  window.location.reload();
  return true;
}

/**
 * Clear the reload counter once the app has loaded successfully, so a future
 * deploy in the same session can recover again. Call after a short delay so a
 * chunk error during initial load still counts against the cap.
 */
export function resetChunkReloadCounter(): void {
  try {
    sessionStorage.removeItem(RELOAD_COUNT_KEY);
  } catch {
    // ignore — nothing to reset
  }
}

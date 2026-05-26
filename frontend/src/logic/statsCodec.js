// statsCodec.js
// Encode and decode stats for export/import.
//
// We use a two-layer approach:
//   1. JSON.stringify → XOR cipher with a key → btoa (base64)
//   2. A version prefix so we can handle format changes in the future
//
// This isn't real encryption — anyone who cares can decode it.
// But it's not plain text either, so casual users won't hand-edit it.
// Good enough for a personal app!

const XOR_KEY = "sudoku-dad-2024"; // arbitrary key — change if you want
const VERSION = "v1";

// XOR each character's char code against the cycling key
function xorCipher(str, key) {
  return str
    .split("")
    .map((char, i) =>
      String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length)),
    )
    .join("");
}

/**
 * Encode stats object → opaque string safe to copy/paste
 * @param {object} stats
 * @returns {string}
 */
export function encodeStats(stats) {
  try {
    const json = JSON.stringify(stats);
    const xored = xorCipher(json, XOR_KEY);
    const encoded = btoa(unescape(encodeURIComponent(xored)));
    return `${VERSION}:${encoded}`;
  } catch {
    throw new Error("Failed to encode stats");
  }
}

/**
 * Decode export string → stats object
 * Returns null if the string is invalid/tampered.
 * @param {string} str
 * @returns {object|null}
 */
export function decodeStats(str) {
  try {
    const trimmed = str.trim();
    if (!trimmed.startsWith(`${VERSION}:`)) return null;

    const encoded = trimmed.slice(VERSION.length + 1);
    const xored = decodeURIComponent(escape(atob(encoded)));
    const json = xorCipher(xored, XOR_KEY); // XOR is its own inverse
    const stats = JSON.parse(json);

    // Basic shape validation — make sure it looks like our stats object
    if (typeof stats !== "object" || stats === null) return null;
    const validDiffs = ["easy", "medium", "hard", "expert"];
    for (const key of Object.keys(stats)) {
      if (!validDiffs.includes(key)) return null;
      const d = stats[key];
      if (
        typeof d.played !== "number" ||
        typeof d.best !== "number" ||
        typeof d.totalTime !== "number"
      )
        return null;
    }

    return stats;
  } catch {
    return null; // any decode/parse error → treat as invalid
  }
}

// Pure text-scoring functions — no DOM, no imports (testable in node).
export function normalizeWords(s) {
  return s.toLowerCase().replace(/[^\p{L}\p{N}' ]/gu, ' ').split(/\s+/).filter(Boolean);
}

export function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

export function wer(ref, hyp) {
  const r = normalizeWords(ref), h = normalizeWords(hyp);
  if (r.length === 0) return h.length === 0 ? 0 : 1;
  return levenshtein(r, h) / r.length;
}

export function pickWinner(entries) {
  // entries: [{key, werVal, ms}] — lower WER wins; tie -> lower latency.
  return entries.reduce((a, b) => (a.werVal !== b.werVal) ? (a.werVal < b.werVal ? a : b) : (a.ms <= b.ms ? a : b));
}

export function vitrinaTypewriterProgress(displayed: string, word: string): number {
  if (word.length === 0) return 1;
  return Math.min(1, Math.max(0, displayed.length / word.length));
}

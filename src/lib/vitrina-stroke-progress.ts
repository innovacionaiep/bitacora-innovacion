export function strokeProgressForSegment(
  progress: number,
  index: number,
  total: number,
): number {
  if (total <= 0) return 0;
  const clamped = Math.min(1, Math.max(0, progress));
  const start = index / total;
  const end = (index + 1) / total;
  if (clamped <= start) return 0;
  if (clamped >= end) return 1;
  return (clamped - start) / (end - start);
}

export function strokeDashoffsetForProgress(segmentProgress: number): number {
  return 1 - Math.min(1, Math.max(0, segmentProgress));
}

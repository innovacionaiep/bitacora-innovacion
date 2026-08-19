'use client';

export type VitrinaRotatingItem = {
  word: string;
  className: string;
  ctaClassName?: string;
};

export function VitrinaRotatingWord({
  items,
  displayed,
  index,
}: {
  items: readonly VitrinaRotatingItem[];
  displayed: string;
  index: number;
}) {
  const current = items[index];
  if (!current) return null;

  const spacer = items.reduce(
    (longest, item) => (item.word.length > longest.length ? item.word : longest),
    current.word,
  );

  return (
    <span className="relative block" aria-live="polite">
      <span className="invisible block" aria-hidden>
        {spacer}
      </span>
      <span className={`absolute inset-x-0 top-0 ${current.className}`}>
        {displayed}
      </span>
    </span>
  );
}

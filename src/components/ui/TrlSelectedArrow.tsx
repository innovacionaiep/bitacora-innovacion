export const TRL_SELECTED_ARROW_PATH = 'M8 5.5 17.5 12 8 18.5Z';

export function TrlSelectedArrow({ className }: { className?: string }) {
  return (
    <svg
      data-testid="trl-selected-chevron"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
    >
      <path
        d={TRL_SELECTED_ARROW_PATH}
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

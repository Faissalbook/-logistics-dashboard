export default function VerifiedBadge({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="text-primary-500 shrink-0">
      <path
        fill="currentColor"
        d="M12 1.5 9.6 4 6.3 3.4 5.2 6.6 2 7.7l.6 3.3L0 13l2.6 2 .6 3.3L6.3 17l3.3.6L12 21.5l2.4-3.9 3.3-.6 1.1-3.2L22 13l-2.6-2-.6-3.3L15.5 6.6l-1.1-3.2-3.3.6z"
      />
      <path
        d="m8 12 3 3 5-6"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

import { type LabelKey, pair } from '@transfasa/i18n';

/** Stacked label: French on top, English smaller underneath (PRD CNV-05). */
export function Stacked({ k, className = '' }: { k: LabelKey; className?: string }) {
  const { fr, en } = pair(k);
  return (
    <span className={`flex flex-col leading-tight ${className}`}>
      <span>{fr}</span>
      {fr !== en && <span className="text-[0.8em] font-normal opacity-60">{en}</span>}
    </span>
  );
}

import type { LabelKey } from '@transfasa/i18n';
import type { LucideIcon } from 'lucide-react';
import { Stacked } from '../components/Bilingual';
import { EmptyState } from '../components/EmptyState';

/** Screen whose feature ships in a later phase; shows a bilingual empty state, never fake data. */
export function UpcomingPage({
  title,
  icon,
  empty,
  phase,
}: {
  title: LabelKey;
  icon: LucideIcon;
  empty: LabelKey;
  phase: number;
}) {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-brand-900">
        <Stacked k={title} />
      </h1>
      <EmptyState icon={icon} title={empty} phase={phase} />
    </div>
  );
}

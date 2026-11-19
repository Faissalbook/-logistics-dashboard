import { type LabelKey, label, phaseLabel } from '@transfasa/i18n';
import type { LucideIcon } from 'lucide-react';

export function EmptyState({ icon: Icon, title, phase }: { icon: LucideIcon; title: LabelKey; phase?: number }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="rounded-full bg-cement-100 p-3 text-cement-500">
        <Icon size={28} aria-hidden />
      </span>
      <p className="text-base font-semibold text-slate-800">{label(title)}</p>
      {phase !== undefined && phase > 0 && (
        <p className="text-sm text-cement-500">
          {phaseLabel(phase)}
        </p>
      )}
    </div>
  );
}

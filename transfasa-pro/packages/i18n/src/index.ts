import { DICTIONARY, type LabelKey } from './dictionary';

export { DICTIONARY, type LabelKey };

export type Lang = 'fr' | 'en';

/** Single-language string. */
export function t(key: LabelKey, lang: Lang): string {
  return DICTIONARY[key][lang];
}

/** Side-by-side bilingual label: `Voyages / Trips`. Collapses when both are identical. */
export function label(key: LabelKey): string {
  const { fr, en } = DICTIONARY[key];
  return fr === en ? fr : `${fr} / ${en}`;
}

/** Message form, French first then English in parentheses: `Champ requis (Required field)`. */
export function msg(key: LabelKey): string {
  const { fr, en } = DICTIONARY[key];
  return fr === en ? fr : `${fr} (${en})`;
}

/** Stacked pair for cards/table headers rendered on two lines. */
export function pair(key: LabelKey): { fr: string; en: string } {
  return DICTIONARY[key];
}

/** "Disponible en phase 3 / Available in phase 3" */
export function phaseLabel(phase: number): string {
  const { fr, en } = DICTIONARY['empty.comingInPhase'];
  return `${fr} ${phase} / ${en} ${phase}`;
}

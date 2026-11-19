import { describe, expect, it } from 'vitest';
import { DICTIONARY, label, msg, phaseLabel, t } from './index';

describe('i18n (CNV-05)', () => {
  it('every key has non-empty fr and en', () => {
    for (const [key, v] of Object.entries(DICTIONARY)) {
      expect(v.fr.trim(), `${key}.fr`).not.toBe('');
      expect(v.en.trim(), `${key}.en`).not.toBe('');
    }
  });
  it('formats French first', () => {
    expect(label('nav.trips')).toBe('Voyages / Trips');
    expect(msg('validation.required')).toBe('Champ requis (Required field)');
    expect(label('nav.import')).toBe('Import');
    expect(t('nav.fleet', 'en')).toBe('Fleet');
    expect(phaseLabel(3)).toBe('Disponible en phase 3 / Available in phase 3');
    expect(label('app.company')).toBe('TransFasa Guinée');
  });
});

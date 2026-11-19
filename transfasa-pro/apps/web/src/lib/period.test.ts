import { describe, expect, it } from 'vitest';
import { periodFor } from './period';

describe('periodFor', () => {
  it('computes calendar periods', () => {
    expect(periodFor('thisMonth', '2026-11-19')).toMatchObject({ from: '2026-11-01', to: '2026-11-30' });
    expect(periodFor('lastMonth', '2026-01-10')).toMatchObject({ from: '2025-12-01', to: '2025-12-31' });
    expect(periodFor('lastMonth', '2028-03-01')).toMatchObject({ from: '2028-02-01', to: '2028-02-29' });
    expect(periodFor('year', '2026-11-19')).toMatchObject({ from: '2026-01-01', to: '2026-12-31' });
  });
});

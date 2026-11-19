import { describe, expect, it } from 'vitest';
import { PERMISSIONS, ROLE_GRANTS, ROLES, can, canAll, normaliseRoles, scopeFor } from './rbac';

describe('RBAC matrix (PRD §9.1)', () => {
  it('OWNER holds every permission on all records', () => {
    for (const p of PERMISSIONS) expect(scopeFor(['OWNER'], p)).toBe('all');
  });

  it('only OWNER manages users, settings and approves purchases', () => {
    for (const r of ROLES.filter((x) => x !== 'OWNER')) {
      expect(can([r], 'user.manage')).toBe(false);
      expect(can([r], 'settings.write')).toBe(false);
      expect(can([r], 'purchase.approve')).toBe(false);
      expect(can([r], 'inspection.override')).toBe(false);
    }
  });

  it('audit log readable only by OWNER and ACCOUNTANT', () => {
    const readers = ROLES.filter((r) => can([r], 'audit.read'));
    expect(readers).toEqual(['OWNER', 'ACCOUNTANT']);
  });

  it('DRIVER is limited to own records', () => {
    expect(scopeFor(['DRIVER'], 'trip.read')).toBe('own');
    expect(scopeFor(['DRIVER'], 'trip.write')).toBe('own');
    expect(can(['DRIVER'], 'trip.validate')).toBe(false);
    expect(can(['DRIVER'], 'landedCost.read')).toBe(false);
  });

  it('INSPECTOR sees only assigned inspections and nothing financial', () => {
    expect(scopeFor(['INSPECTOR'], 'inspection.fill')).toBe('assigned');
    expect(can(['INSPECTOR'], 'landedCost.read')).toBe(false);
    expect(can(['INSPECTOR'], 'trip.read')).toBe(false);
  });

  it('VIEWER has no write permission', () => {
    const writes = Object.keys(ROLE_GRANTS.VIEWER).filter((p) =>
      /\.(write|manage|validate|approve|override|commission|close|unlock|fill)/.test(p),
    );
    expect(writes).toEqual([]);
  });

  it('multiple roles take the widest scope', () => {
    expect(scopeFor(['DRIVER', 'FLEET_MANAGER'], 'trip.read')).toBe('all');
    expect(canAll(['DRIVER'], 'trip.read')).toBe(false);
  });

  it('ignores unknown roles and empty input', () => {
    expect(can(['ADMIN'], 'trip.read')).toBe(false);
    expect(can(undefined, 'trip.read')).toBe(false);
    expect(normaliseRoles(['VIEWER', 'x', 'OWNER', 'VIEWER', 3])).toEqual(['OWNER', 'VIEWER']);
    expect(normaliseRoles('OWNER')).toEqual([]);
  });

  it('every grant references a declared permission', () => {
    for (const r of ROLES) {
      for (const p of Object.keys(ROLE_GRANTS[r])) expect(PERMISSIONS).toContain(p);
    }
  });
});

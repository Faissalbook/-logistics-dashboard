import { expect, test } from '@playwright/test';
import { ROLES, ROLE_LABELS, can, type Role } from '../packages/domain/src/index';

/** P0 acceptance: every role can sign in and sees exactly the navigation its permissions allow. */
const PASSWORD = 'Transfasa#2026';
const emailFor = (r: Role) => `${r.toLowerCase().replace('_', '-')}@transfasa.test`;

const GATED: { path: string; fr: string; perm: Parameters<typeof can>[1] }[] = [
  { path: '/trips', fr: 'Voyages', perm: 'trip.read' },
  { path: '/fleet', fr: 'Flotte', perm: 'vehicle.read' },
  { path: '/admin/users', fr: 'Utilisateurs', perm: 'user.manage' },
  { path: '/admin/audit', fr: 'Journal d’audit', perm: 'audit.read' },
];

for (const role of ROLES) {
  test(`sign in as ${role}`, async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel(/E-mail/).fill(emailFor(role));
    await page.getByLabel(/Mot de passe/).fill(PASSWORD);
    await page.getByRole('button', { name: /Se connecter/ }).click();

    await expect(page.getByTestId('role-chips')).toContainText(ROLE_LABELS[role].fr);

    // On phones, overflow destinations live in the "Plus" sheet.
    const more = page.getByRole('button', { name: /^Plus/ });
    if (await more.isVisible()) await more.click();

    for (const g of GATED) {
      const res = page.getByRole('link', { name: new RegExp(`^${g.fr}`) }).first();
      if (can([role], g.perm)) await expect(res).toBeAttached();
      else await expect(res).toHaveCount(0);
    }

    // Direct URL access to a forbidden screen shows the denial, not the content.
    await page.goto('/admin/users');
    if (role === 'OWNER') await expect(page.getByRole('heading', { name: /Utilisateurs et rôles/ })).toBeVisible();
    else await expect(page.getByText('Accès refusé (Permission denied)')).toBeVisible();
  });
}

test('wrong password shows an inline bilingual error', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/E-mail/).fill(emailFor('OWNER'));
  await page.getByLabel(/Mot de passe/).fill('wrong-password');
  await page.getByRole('button', { name: /Se connecter/ }).click();
  await expect(page.getByRole('alert')).toHaveText('E-mail ou mot de passe incorrect (Incorrect email or password)');
});

test('owner sees role changes in the audit log and the chain verifies', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/E-mail/).fill(emailFor('OWNER'));
  await page.getByLabel(/Mot de passe/).fill(PASSWORD);
  await page.getByRole('button', { name: /Se connecter/ }).click();
  await expect(page.getByTestId('role-chips')).toBeVisible();

  await page.goto('/admin/users');
  const card = page.getByTestId(`user-${emailFor('VIEWER')}`);
  await card.getByLabel(/Comptable/).check();
  await card.getByRole('button', { name: /Enregistrer les rôles/ }).click();
  await expect(card.getByRole('status')).toHaveText('Rôles enregistrés (Roles saved)');
  await card.getByLabel(/Comptable/).uncheck();
  await card.getByRole('button', { name: /Enregistrer les rôles/ }).click();
  await expect(card.getByRole('status')).toHaveText('Rôles enregistrés (Roles saved)');

  await page.goto('/admin/audit');
  await expect(page.getByText('Changement de rôles / Role change').first()).toBeVisible();
  await page.getByRole('button', { name: /Vérifier la chaîne/ }).click();
  await expect(page.getByTestId('chain-status')).toContainText('Chaîne intègre');
});

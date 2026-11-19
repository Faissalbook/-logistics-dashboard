import { type Page, expect, test } from '@playwright/test';

/** Phase 1 acceptance in the browser: trip entry (OPS-01..04), lists, expenses, dashboard, driver scope. */
const PASSWORD = 'Transfasa#2026';

async function signIn(page: Page, who: string) {
  await page.goto('/login');
  await page.getByLabel(/E-mail/).fill(`${who}@transfasa.test`);
  await page.getByLabel(/Mot de passe/).fill(PASSWORD);
  await page.getByRole('button', { name: /Se connecter/ }).click();
  // After sign-in the app returns to the page the user came from, or the dashboard.
  await expect(page).not.toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

async function signOut(page: Page) {
  await page.getByRole('button', { name: /Se déconnecter/ }).first().click();
  await expect(page).toHaveURL(/\/login$/);
}

const select = (page: Page, testId: string, labelText: string) => page.getByTestId(testId).selectOption({ label: labelText });

test.describe.configure({ mode: 'serial' });

test('fleet manager enters a trip: auto-fill, rate card, live profit, inline validation', async ({ page }, info) => {
  await signIn(page, 'fleet-manager');
  await page.goto('/trips/new');
  await select(page, 'trip-truck', 'E2E001');
  await expect(page.getByTestId('trip-driver')).toHaveValue(/.+/);
  await expect(page.getByTestId('trip-driver').locator('option:checked')).toHaveText('Chauffeur E2E');

  await select(page, 'trip-region', 'Coyah');
  await select(page, 'trip-destination', 'Coyah-Centre');
  await select(page, 'trip-cement', 'CIMII/AP42.5 N');
  await page.getByTestId('trip-tonnage').fill('40');

  // Rate card pre-fill (OPS-02) and live profit (OPS-01)
  await expect(page.getByTestId('rate-card-hint')).toContainText('grille tarifaire');
  await expect(page.getByTestId('trip-revenue')).toHaveValue('4,000,000');
  await expect(page.getByTestId('live-profit')).toHaveText('2,860,000 GNF');

  await page.getByTestId('trip-fuel').fill('600000');
  await expect(page.getByTestId('trip-fuel')).toHaveValue('600,000');
  await expect(page.getByText('modifié / edited')).toBeVisible();
  await page.getByTestId('trip-other').fill('270000');
  await expect(page.getByTestId('live-cost')).toHaveText('1,470,000 GNF');
  await expect(page.getByTestId('live-profit')).toHaveText('2,530,000 GNF');

  // Other costs need a reason — shown inline, not as an alert
  await page.getByTestId('trip-save').click();
  await expect(page.getByText('Motif requis pour les autres frais (Reason required for other costs)')).toBeVisible();
  await page.getByTestId('trip-other-reason').fill(`Police ${info.project.name}`);
  await page.getByTestId('trip-save').click();

  await expect(page).toHaveURL(/\/trips$/);
  await expect(page.getByRole('status')).toHaveText('Voyage enregistré (Trip saved)');
  const row = page.locator(info.project.name === 'mobile' ? '[data-testid="trip-card"]' : '[data-testid="trips-table"] tbody tr').first();
  await expect(row).toContainText('E2E001');
  await expect(row).toContainText('2,530,000');
});

test('duplicate a trip, validate it, then the accountant unlocks it with a reason', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'status workflow covered once on desktop');
  await signIn(page, 'fleet-manager');
  await page.goto('/trips');
  const row = page.locator('[data-testid="trips-table"] tbody tr').first();
  await row.getByRole('link', { name: /Dupliquer/ }).click();
  await expect(page.getByTestId('trip-revenue')).toHaveValue('4,000,000');
  await page.getByTestId('trip-save').click();
  await expect(page).toHaveURL(/\/trips$/);

  const first = page.locator('[data-testid="trips-table"] tbody tr').first();
  await first.getByRole('button', { name: /Valider/ }).click();
  await expect(first).toContainText('Validé / Validated');
  await expect(first.getByRole('link', { name: /Modifier/ })).toHaveCount(0);

  await signOut(page);
  await signIn(page, 'accountant');
  await page.goto('/trips');
  const v = page.locator('[data-testid="trips-table"] tbody tr', { hasText: 'Validé / Validated' }).first();
  await v.getByRole('button', { name: /Déverrouiller/ }).click();
  await page.getByRole('button', { name: /Confirmer/ }).click();
  await expect(page.getByText('Champ requis (Required field)')).toBeVisible();
  await page.getByLabel(/Motif/).fill('Erreur de saisie');
  await page.getByRole('button', { name: /Confirmer/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.goto('/admin/audit');
  await expect(page.getByText('Accès refusé (Permission denied)')).toHaveCount(0);
  await expect(page.getByText('Changement de statut / Status change').first()).toBeVisible();
});

test('expenses: record a truck expense with totals', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'covered on desktop');
  await signIn(page, 'fleet-manager');
  await page.goto('/expenses');
  await page.getByTestId('new-expense').click();
  await page.getByTestId('expense-save').click();
  await expect(page.getByText('Champ requis (Required field)').first()).toBeVisible();
  await page.getByTestId('expense-type').selectOption({ label: 'Réparation / Repair' });
  await page.getByTestId('expense-amount').fill('2500000');
  await page.getByLabel(/Camion \(vide/).selectOption({ label: 'E2E001' });
  await page.getByTestId('expense-description').fill('Vidange');
  await page.getByTestId('expense-save').click();
  await expect(page.getByTestId('expenses-table')).toContainText('Vidange');
  await expect(page.getByTestId('expenses-total')).toHaveText('2,500,000 GNF');
});

test('owner dashboard shows this year’s figures; driver sees only own trips and no company expenses', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'covered on desktop');
  await signIn(page, 'owner');
  await page.goto('/');
  await expect(page.getByTestId('kpi-trips')).not.toHaveText('0');
  await expect(page.getByTestId('kpi-net')).toContainText('GNF');
  await expect(page.getByTestId('by-truck')).toContainText('E2E001');

  await signOut(page);
  await signIn(page, 'driver');
  await page.goto('/');
  await expect(page.getByTestId('kpi-trips')).toBeVisible();
  await expect(page.getByTestId('kpi-net')).toHaveCount(0);
  await expect(page.getByTestId('by-truck')).not.toContainText('E2E002');
  await page.goto('/trips');
  await expect(page.getByTestId('new-trip')).toHaveCount(0);
  const rows = page.locator('[data-testid="trips-table"] tbody tr');
  await expect(rows.first()).toContainText('E2E001');
  for (const text of await rows.allInnerTexts()) expect(text).toContain('E2E001');
});

test('fleet manager adds a destination; vehicles list shows the assigned driver', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'covered on desktop');
  await signIn(page, 'fleet-manager');
  await page.goto('/reference');
  await page.getByTestId('ref-add').click();
  await page.getByLabel(/Région/).first().selectOption('Dubréka');
  await page.getByTestId('dest-name').fill('Ouassou');
  await page.getByRole('button', { name: /^Enregistrer/ }).click();
  await expect(page.getByText('Ouassou')).toBeVisible();

  await page.goto('/fleet');
  await expect(page.getByTestId('vehicle-E2E001')).toContainText('Chauffeur E2E');
});

test('every main screen fits a phone screen without sideways scrolling', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'phone layout check');
  await signIn(page, 'owner');
  for (const path of ['/', '/trips', '/trips/new', '/expenses', '/fleet', '/reference', '/admin/users', '/admin/audit']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(0);
  }
  await page.goto('/');
  await page.getByRole('button', { name: /^Plus/ }).click();
  await expect(page.getByRole('link', { name: /^Utilisateurs/ }).last()).toBeVisible();
});

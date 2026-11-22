import { expect, test } from '@playwright/test';
import { checkMobile, snap } from './helpers';

test('hero checker is live; main workflow: check, fix, save, revisit', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByTestId('hero-ratio')).toHaveText('3.19:1');
  await page.getByRole('button', { name: 'Ink on paper' }).click();
  await expect(page.getByTestId('hero-ratio')).not.toHaveText('3.19:1');
  await page.waitForTimeout(1200); // let the entrance animation settle for the screenshot
  await snap(page, 'landing');
  await checkMobile(page, 'landing-mobile');

  await page.getByRole('link', { name: 'Open the checker' }).first().click();
  await page.getByLabel('Text colour', { exact: true }).fill('#a0a0a0');
  await page.getByLabel('Background colour', { exact: true }).fill('#ffffff');
  await expect(page.getByTestId('ratio')).toHaveText('2.61:1');
  await page.getByRole('button', { name: 'Apply' }).first().click();
  const ratio = parseFloat((await page.getByTestId('ratio').textContent()) ?? '0');
  expect(ratio).toBeGreaterThanOrEqual(4.5);
  await page.getByLabel('Save this pair as').fill('Muted label');
  await page.getByRole('button', { name: 'Save pair' }).click();
  await expect(page.getByText('Saved “Muted label”')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await snap(page, 'checker');
  await checkMobile(page);

  await page.reload();
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Saved pairs' }).click();
  await expect(page.getByRole('heading', { name: 'Muted label' })).toBeVisible();
  await snap(page, 'saved');
});

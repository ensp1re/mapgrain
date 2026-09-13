import type { Page } from "playwright";

export async function waitStartOrEditor(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll("button")].some((button) => {
        const label = `${button.getAttribute("aria-label") ?? ""} ${button.textContent ?? ""}`;
        return label.includes("Arrange") || label.includes("New architecture");
      }),
    undefined,
    { timeout: 15_000 },
  );
}

export async function goNew(page: Page): Promise<void> {
  if (await page.getByRole("heading", { name: "New diagram" }).isVisible().catch(() => false)) return;
  await page.getByRole("button", { name: "New diagram" }).click();
  await page.getByRole("heading", { name: "New diagram" }).waitFor({ timeout: 10_000 });
}

export async function addKind(page: Page, kind: string): Promise<void> {
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("menuitem", { name: new RegExp(kind, "i") }).click();
}

/** The editor is ready once the canvas library is mounted. */
export async function waitEditor(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Add", exact: true }).waitFor({ timeout: 15_000 });
}

/** Export lives in More, beside Open file. */
export async function openExport(page: Page): Promise<void> {
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitem", { name: "Export" }).click();
  await page.getByRole("dialog", { name: "Export" }).waitFor({ timeout: 10_000 });
}

/** Opens a template from the start screen by its card label. */
export async function useTemplate(page: Page, name: string): Promise<void> {
  const card = page.getByRole("button", { name: `Use template ${name}` });
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await page.locator(".node-card").first().waitFor({ timeout: 10_000 });
}

/** The outline lists connections after the canvas has drawn, so a click must wait for them. */
export async function waitConnections(page: Page): Promise<void> {
  await page.locator(".outline-row.is-connection").first().waitFor({ timeout: 15_000 });
}

/**
 * The outline re-renders as the canvas settles, so a click can land on a row that is being
 * replaced and quietly do nothing. Retry until the inspector shows what was asked for.
 */
export async function selectOutlineRow(
  page: Page,
  selector: string,
  expect: "Component" | "Connection",
  index = 0,
): Promise<void> {
  const pane = page.locator(".inspector .pane-label", { hasText: expect });
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await page.locator(selector).nth(index).click();
    const shown = await pane
      .waitFor({ timeout: 2_000 })
      .then(() => true)
      .catch(() => false);
    if (shown) return;
  }
  throw new Error(`the outline never opened the ${expect} inspector for ${selector}`);
}

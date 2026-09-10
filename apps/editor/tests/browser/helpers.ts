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
  await page.getByRole("button", { name: "Document menu" }).click();
  await page.getByRole("menuitem", { name: "New diagram" }).click();
  await page.getByRole("heading", { name: "New diagram" }).waitFor({ timeout: 10_000 });
}

export async function addKind(page: Page, kind: string): Promise<void> {
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("menuitem", { name: new RegExp(kind, "i") }).click();
}

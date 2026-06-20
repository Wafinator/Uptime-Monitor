import { test, expect } from "@playwright/test";
import pg from "pg";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || "postgres://uptime:uptime@localhost:5433/uptime_test";

// Wipe between tests so each one starts from zero and order doesn't matter.
// Same idea as the backend integration tests with TRUNCATE.
test.beforeEach(async () => {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  await client.query("TRUNCATE monitors, monitor_logs RESTART IDENTITY CASCADE");
  await client.end();
});

test.describe("Dashboard", () => {
  test("shows empty state when no monitors exist", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Uptime Monitor" })).toBeVisible();
    await expect(page.getByText(/No monitors yet/)).toBeVisible();
  });

  test("can add a monitor", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("open-add-form").click();
    await page.getByTestId("field-name").fill("Example");
    await page.getByTestId("field-url").fill("https://example.com");
    await page.getByTestId("submit-monitor").click();

    const card = page.getByTestId("monitor-card");
    await expect(card).toHaveCount(1);
    await expect(card).toContainText("Example");
    await expect(card).toContainText("https://example.com");
    await expect(card).toContainText("Checks every 5 min");
  });

  test("can add multiple monitors and they appear newest-first", async ({ page }) => {
    await page.goto("/");

    for (const name of ["First", "Second", "Third"]) {
      await page.getByTestId("open-add-form").click();
      await page.getByTestId("field-name").fill(name);
      await page.getByTestId("field-url").fill(`https://${name.toLowerCase()}.example.com`);
      await page.getByTestId("submit-monitor").click();
      // Wait until this card shows up before queueing the next one.
      await expect(page.getByTestId("monitor-card").filter({ hasText: name })).toBeVisible();
    }

    const cards = page.getByTestId("monitor-card");
    await expect(cards).toHaveCount(3);
    // Newest first so Third should be at the top.
    await expect(cards.nth(0)).toContainText("Third");
    await expect(cards.nth(2)).toContainText("First");
  });

  test("can pause and resume a monitor", async ({ page }) => {
    await page.goto("/");
    await addMonitor(page, "Pausable", "https://pausable.example.com");

    const card = page.getByTestId("monitor-card");
    await expect(card).not.toContainText("Paused");

    await card.getByTestId("monitor-toggle").click();
    await expect(card).toContainText("Paused");

    await card.getByTestId("monitor-toggle").click();
    await expect(card).not.toContainText("Paused");
  });

  test("can delete a monitor", async ({ page }) => {
    await page.goto("/");
    await addMonitor(page, "Doomed", "https://doomed.example.com");
    await expect(page.getByTestId("monitor-card")).toHaveCount(1);

    // Delete pops a confirm dialog. Auto-accept it.
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("monitor-delete").click();

    await expect(page.getByTestId("monitor-card")).toHaveCount(0);
    await expect(page.getByText(/No monitors yet/)).toBeVisible();
  });

  test("clicking a card opens the detail view", async ({ page }) => {
    await page.goto("/");
    await addMonitor(page, "DetailMe", "https://detail.example.com");

    await page.getByTestId("monitor-card").click();

    const detail = page.getByTestId("monitor-detail");
    await expect(detail).toBeVisible();
    await expect(detail.getByRole("heading", { name: "DetailMe" })).toBeVisible();
    await expect(detail).toContainText("Recent checks");
  });
});

test.describe("Form validation", () => {
  test("blocks submit when required fields are empty (HTML validation)", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("open-add-form").click();
    await page.getByTestId("submit-monitor").click();

    // Form should still be open and no card should have been created.
    await expect(page.getByTestId("add-monitor-form")).toBeVisible();
    await expect(page.getByTestId("monitor-card")).toHaveCount(0);
  });

  test("shows backend error for invalid URL scheme", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("open-add-form").click();
    await page.getByTestId("field-name").fill("Bad");
    // The browser's URL validation accepts ftp:// so the form submits and
    // we see the backend's 400 in the UI.
    await page.getByTestId("field-url").fill("ftp://example.com");
    await page.getByTestId("submit-monitor").click();

    await expect(page.getByTestId("add-error")).toBeVisible();
    await expect(page.getByTestId("add-error")).toContainText("400");
  });
});

// Quick helper. Open the form, fill in name and URL, hit submit, wait for the card.
async function addMonitor(page, name, url) {
  await page.getByTestId("open-add-form").click();
  await page.getByTestId("field-name").fill(name);
  await page.getByTestId("field-url").fill(url);
  await page.getByTestId("submit-monitor").click();
  await expect(page.getByTestId("monitor-card").filter({ hasText: name })).toBeVisible();
}

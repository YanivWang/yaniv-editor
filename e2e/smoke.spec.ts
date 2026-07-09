import { expect, test } from "@playwright/test";

import { assertNoRuntimeErrors, attachPageDiagnostics, expectEditorReady } from "./helpers";

const DEMO_ROUTES = [
  { path: "/#/", editors: 0, name: "home" },
  { path: "/#/full-editor", editors: 1, name: "full-editor" },
  { path: "/#/inline-editor", editors: 1, name: "inline-editor" },
  { path: "/#/inline-compose", editors: 1, name: "inline-compose" },
  { path: "/#/multi-instance", editors: 2, name: "multi-instance" },
] as const;

test.describe("Demo smoke", () => {
  for (const route of DEMO_ROUTES) {
    test(`${route.name} route loads without runtime errors`, async ({ page }) => {
      const errors = attachPageDiagnostics(page);
      await page.goto(route.path);

      if (route.editors > 0) {
        await expect(page.locator(".yaniv-editor")).toHaveCount(route.editors);
        await expectEditorReady(page);
      } else {
        await expect(page.locator(".demo-home, .demo-page")).toBeVisible();
      }

      assertNoRuntimeErrors(errors, route.name);
    });
  }
});

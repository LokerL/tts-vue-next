import { describe, expect, test } from "vitest";
import { resolveThemeName } from "./themeMode";

describe("resolveThemeName", () => {
  test("uses the system preference when mode is system", () => {
    expect(resolveThemeName("system", true)).toBe("dark");
    expect(resolveThemeName("system", false)).toBe("light");
  });

  test("uses explicit light and dark modes directly", () => {
    expect(resolveThemeName("light", true)).toBe("light");
    expect(resolveThemeName("dark", false)).toBe("dark");
  });
});

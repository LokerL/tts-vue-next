import type { ThemeMode } from "../types";

export function resolveThemeName(mode: ThemeMode, prefersDark: boolean): "light" | "dark" {
  if (mode === "light" || mode === "dark") {
    return mode;
  }

  return prefersDark ? "dark" : "light";
}

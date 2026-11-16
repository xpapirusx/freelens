/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import draculaThemeSource from "./dracula.theme.yaml?raw";
import freelensThemeSource from "./freelens.theme.yaml?raw";
import { parseThemeFile } from "./parse";
import radarThemeSource from "./radar.theme.yaml?raw";

import type { ThemeFile } from "./schema";

export const builtInThemeName = "freelens";

export const builtInThemeSources: readonly string[] = [freelensThemeSource, radarThemeSource, draculaThemeSource];

const parseBuiltInTheme = (source: string): ThemeFile => {
  const result = parseThemeFile(source);

  if (!result.isValid) {
    throw new Error(`A built-in theme is invalid: ${result.error}`);
  }

  return result.theme;
};

/**
 * Every theme bundled with the application. The first one, `freelens`, defines every token:
 * the other themes take the tokens they leave out from it.
 */
export const builtInThemes: readonly ThemeFile[] = builtInThemeSources.map(parseBuiltInTheme);

/**
 * The names the built-in themes take, which an imported theme cannot take.
 */
export const builtInThemeNames: ReadonlySet<string> = new Set(builtInThemes.map((theme) => theme.metadata.name));

/**
 * The theme the application falls back to, and the one that defines every token.
 */
export const builtInTheme: ThemeFile = builtInThemes[0];

export const getBuiltInTheme = (name: string): ThemeFile | undefined =>
  builtInThemes.find((theme) => theme.metadata.name === name);

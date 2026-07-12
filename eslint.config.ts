import js from "@eslint/js";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: [
      "docs/**",
      "**/dist/**",
      "**/.nuxt/**",
      "**/.output/**",
      "**/node_modules/**",
      "**/coverage/**",
    ],
  },

  {
    files: ["**/*.{js,mjs,cjs}"],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },

  {
    files: ["**/*.{ts,mts,cts}"],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },

  {
    files: ["**/*.json"],
    plugins: { json },
    language: "json/json",
    extends: ["json/recommended"],
  },

  {
    files: ["**/*.md"],
    plugins: { markdown },
    language: "markdown/commonmark",
    extends: ["markdown/recommended"],
  },
]);

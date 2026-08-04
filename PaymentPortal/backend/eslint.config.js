// eslint.config.js (backend)
import js from "@eslint/js";
import globals from "globals";
import importPlugin from "eslint-plugin-import";
import prettier from "eslint-config-prettier";

export default [
  // ignore build + deps
  { ignores: ["dist/**", "node_modules/**"] },

  // base JS rules
  js.configs.recommended,

  {
    plugins: { import: importPlugin },

    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        // Node globals (process, Buffer, __dirname, etc.)
        ...globals.node,

        // Node 18+ has global fetch / URLSearchParams — tell ESLint explicitly
        fetch: "readonly",
        URLSearchParams: "readonly",
      },
    },

    rules: {
      // keep console allowed for server logs
      "no-console": "off",

      // nice-to-have import ordering (optional)
      "import/order": [
        "warn",
        {
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
          groups: [
            ["builtin", "external"],
            ["internal", "parent", "sibling", "index"],
            ["type"],
          ],
        },
      ],
    },
  },

  // turn off stylistic clashes with Prettier if you use it
  prettier,
];

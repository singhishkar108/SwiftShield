import js from "@eslint/js";
import reactRecommended from "eslint-plugin-react/configs/recommended.js";
import prettier from "eslint-config-prettier";

export default [
  js.configs.recommended,
  reactRecommended,
  {
    settings: { react: { version: "detect" } },
    rules: {}
  },
  prettier
];

// @ts-check
const tseslint = require("typescript-eslint");

module.exports = tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "eslint.config.js", "coverage/**"] },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  }
);

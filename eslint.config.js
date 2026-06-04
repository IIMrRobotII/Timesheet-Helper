import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";
import globals from "globals";

const restrictedHtmlSyntax = [
  {
    selector:
      "AssignmentExpression[left.type='MemberExpression'][left.property.name='innerHTML'], AssignmentExpression[left.type='MemberExpression'][left.property.value='innerHTML']",
    message: "Use textContent or DOM API builders instead of innerHTML.",
  },
  {
    selector:
      "AssignmentExpression[left.type='MemberExpression'][left.property.name='outerHTML'], AssignmentExpression[left.type='MemberExpression'][left.property.value='outerHTML']",
    message: "Avoid outerHTML mutations; use DOM API instead.",
  },
  {
    selector:
      "CallExpression[callee.type='MemberExpression'][callee.property.name='insertAdjacentHTML'], CallExpression[callee.type='MemberExpression'][callee.property.value='insertAdjacentHTML']",
    message: "Avoid insertAdjacentHTML; create elements and set textContent instead.",
  },
  {
    selector:
      "CallExpression[callee.type='MemberExpression'][callee.object.name='document'][callee.property.name='write'], CallExpression[callee.type='MemberExpression'][callee.object.name='document'][callee.property.value='write']",
    message: "document.write is forbidden.",
  },
  {
    selector:
      "CallExpression[callee.type='MemberExpression'][callee.property.name='createContextualFragment'], CallExpression[callee.type='MemberExpression'][callee.property.value='createContextualFragment']",
    message: "Avoid Range.createContextualFragment; use safer DOM creation methods.",
  },
];

export default tseslint.config(
  { ignores: [".output/**", ".wxt/**", "dist/**", "node_modules/**", "docs/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, chrome: "readonly" },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      eqeqeq: "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-restricted-syntax": ["error", ...restrictedHtmlSyntax],
    },
  },
  {
    files: ["lib/**/*.test.ts"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  {
    files: ["scripts/**/*.js"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  prettier
);

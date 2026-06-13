import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "customer_shipping_settlement/.venv/**",
      "customer_shipping_settlement/.venv-mac/**"
    ]
  },
  ...nextVitals,
  ...nextTypescript
];

export default eslintConfig;

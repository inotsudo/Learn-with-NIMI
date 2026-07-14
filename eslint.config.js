import nextConfig from "eslint-config-next";

const config = [
  {
    ignores: ["node_modules/**", ".next/**", "dist/**", "make-circle.cjs"],
  },
  ...nextConfig,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      "@next/next/no-img-element": "off",
      "react/no-unescaped-entities": "off",
    },
  },
];

export default config;

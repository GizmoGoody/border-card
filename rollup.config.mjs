import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/border-card.ts",
  output: {
    file: "dist/border-card.js",
    format: "es",
  },
  plugins: [resolve(), json(), typescript(), terser({ format: { comments: false } })],
};

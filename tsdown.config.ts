import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts", "src/react.tsx", "src/seo.ts", "src/testing.ts"],
	format: "esm",
	dts: true,
	clean: true,
	external: ["react", "vitest"],
});

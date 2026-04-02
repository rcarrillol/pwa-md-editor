import { defineConfig, minimalPreset } from "@vite-pwa/assets-generator/config";

export default defineConfig({
  preset: {
    ...minimalPreset,
    // output goes to public/icons/
  },
  images: ["icon.svg"],
});

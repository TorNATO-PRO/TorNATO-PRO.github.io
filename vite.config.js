import { defineConfig } from "vite";
import { glob } from "glob";
import path from "path";

export default defineConfig({
  build: {
    emptyOutDir: true,
    rollupOptions: {
      input: {
        ...Object.fromEntries(
          glob.sync("./**/*.html", {
            ignore: ["./dist/**"],
          }).map((file) => [
            path.relative(".", file).replace(".html", ""),
            path.resolve(__dirname, file),
          ])
        ),
      },
      output: {
        // Use a unified naming pattern for all assets.
        assetFileNames: "assets/[name]-[hash][extname]",
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
      },
    },
  },
  base: "/",
});
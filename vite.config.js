import { defineConfig } from "vite";

export default defineConfig({
    build: {
        emptyOutDir: true,
        cssMinify: true,
        rollupOptions: {
            input: {
                main: "./index.html",
                portfolio: './pages/portfolio.html'
            }
        }
    },
    plugins: [
    ]
})
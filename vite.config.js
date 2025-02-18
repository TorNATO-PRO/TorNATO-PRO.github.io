import { defineConfig } from "vite";
import { glob } from "glob"
import path from 'path'

export default defineConfig({
    build: {
        emptyOutDir: true,
        clean: true,
        cssMinify: true,
        rollupOptions: {
            input: {
                // Include all HTML files
                ...Object.fromEntries(
                    glob.sync('./**/*.html', {
                        ignore: ['./node_modules/**', './dist/**']
                    }).map(file => [
                        path.relative('.', file).replace('.html', ''),
                        path.resolve(__dirname, file)
                    ])
                ),
                // Include all JS files from src directory
                ...Object.fromEntries(
                    glob.sync('./src/**/*.js', {
                        ignore: ['./node_modules/**', './dist/**']
                    }).map(file => [
                        path.relative('./src', file).replace('.js', ''),
                        path.resolve(__dirname, file)
                    ])
                )
            }
        }
    },
    plugins: []
})
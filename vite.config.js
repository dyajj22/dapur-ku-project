import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// If deploying to GitHub Pages at https://USERNAME.github.io/REPO_NAME/,
// uncomment the base line below and replace REPO_NAME with your repo's name.
export default defineConfig({
  plugins: [react()],
  // base: "/REPO_NAME/",
});

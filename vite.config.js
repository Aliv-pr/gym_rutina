import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" usa rutas relativas para los assets, así el build funciona
// tanto en GitHub Pages (repo.github.io/nombre-repo/) como en Netlify (dominio raíz)
// sin tener que tocar nada según dónde se despliegue.
export default defineConfig({
  plugins: [react()],
  base: "./",
});

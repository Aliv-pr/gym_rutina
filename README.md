# Rutinas — Fuerza

App de planificación de rutinas de fuerza (días, ejercicios, volumen semanal por grupo muscular). React + Vite + Tailwind + Recharts. Los datos se guardan en `localStorage` del navegador (no hay backend).

## Desarrollo local

Requiere [Node.js](https://nodejs.org) 18 o superior.

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`.

## Subir a GitHub

```bash
git init
git add .
git commit -m "Rutinas de fuerza"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

## Desplegar en GitHub Pages

Ya incluye el workflow `.github/workflows/deploy.yml`, que compila y publica automáticamente en cada push a `main`.

1. En GitHub, ve a **Settings → Pages**.
2. En "Build and deployment" → **Source**, elige **GitHub Actions**.
3. Haz push a `main` (o ejecuta el workflow manualmente desde la pestaña **Actions**).
4. En unos minutos la app queda publicada en `https://TU_USUARIO.github.io/TU_REPO/`.

No hace falta tocar `vite.config.js`: usa rutas relativas (`base: "./"`), así que funciona sin importar el nombre del repositorio.

## Desplegar en Netlify

Ya incluye `netlify.toml` con el comando de build y la carpeta de salida configurados.

**Opción A — desde el dashboard:**
1. [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**.
2. Conecta tu cuenta de GitHub y elige este repositorio.
3. Netlify detecta `netlify.toml` automáticamente (build: `npm run build`, publish: `dist`). Click **Deploy**.

**Opción B — Netlify CLI:**
```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

## Estructura del proyecto

```
├── .github/workflows/deploy.yml   # CI/CD para GitHub Pages
├── src/
│   ├── App.jsx                    # Componente principal (toda la app)
│   ├── main.jsx                   # Entry point de React
│   └── index.css                  # Tailwind + fuente
├── index.html
├── netlify.toml
├── tailwind.config.js
├── vite.config.js
└── package.json
```

## Notas

- Los datos (días, ejercicios, semana, rangos de volumen) se guardan localmente en el navegador vía `localStorage`. Si limpias los datos del sitio o cambias de navegador/dispositivo, se pierden — usa el botón **Exportar** dentro de la app para respaldar un JSON, e **Importar** para restaurarlo.
- Todas las clases de Tailwind ya usadas en `App.jsx` funcionan con la configuración incluida; no se requiere ningún ajuste adicional.

# Rutinas — Entrenamiento de fuerza

Aplicación React/Vite para organizar rutinas de fuerza, semana y análisis.

## Ejecutar localmente

Requiere Node.js.

```bash
npm install
npm run dev
```

Para crear la versión de producción:

```bash
npm run build
```

El resultado queda en `dist/`.

## Publicar en GitHub Pages

Este proyecto usa Vite y tiene `base: "./"`, por lo que el contenido de `dist/` puede publicarse como sitio estático.

Una forma sencilla es usar GitHub Actions para ejecutar `npm install` + `npm run build` y publicar `dist/`.

## Datos

Los datos de la aplicación se guardan en `localStorage` del navegador. También se conservan las funciones de exportar/importar JSON incluidas en la aplicación.

Nota: `localStorage` es específico de cada navegador/dispositivo. Exporta tus datos desde la aplicación si quieres hacer una copia de seguridad o moverlos a otro dispositivo.

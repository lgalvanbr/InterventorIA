import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';
import { fileURLToPath } from 'url';

const root = fileURLToPath(new URL('.', import.meta.url));

// Tailwind compilado en el build (antes se cargaba desde cdn.tailwindcss.com y se
// compilaba dentro del navegador en cada carga, lo que hacía lenta la app en celulares).
/** @type {import('tailwindcss').Config} */
export default {
  content: [`${root}index.html`, `${root}src/**/*.{js,jsx}`],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#00236f",
        "on-primary": "#ffffff",
        "primary-container": "#1e3a8a",
        "on-primary-container": "#90a8ff",
        "secondary": "#515f74",
        "on-secondary": "#ffffff",
        "secondary-container": "#d5e3fc",
        "on-secondary-container": "#57657a",
        "tertiary": "#222a3e",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#384055",
        "on-tertiary-container": "#a4acc5",
        "background": "#f7f9fb",
        "on-background": "#191c1e",
        "surface": "#ffffff", // Pure white for Level 1 Cards
        "on-surface": "#191c1e",
        "surface-variant": "#e0e3e5",
        "on-surface-variant": "#444651",
        "surface-dim": "#d8dadc",
        "surface-bright": "#f7f9fb",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f2f4f6",
        "surface-container": "#eceef0",
        "surface-container-high": "#e6e8ea",
        "surface-container-highest": "#e0e3e5",
        "outline": "#757682",
        "outline-variant": "#c5c5d3",
        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",
        "inverse-surface": "#2d3133",
        "inverse-on-surface": "#eff1f3",
        "inverse-primary": "#b6c4ff"
      },
      borderRadius: {
        "DEFAULT": "0.125rem",
        "lg": "0.25rem",
        "xl": "0.5rem",
        "full": "9999px"
      },
      spacing: {
        "stack-sm": "8px",
        "stack-md": "16px",
        "stack-lg": "32px",
        "container-max": "1440px",
        "unit": "4px",
        "gutter": "24px",
        "margin-mobile": "16px",
        "margin-desktop": "40px"
      },
      fontFamily: {
        "headline-lg": ["Inter"],
        "headline-md": ["Inter"],
        "body-lg": ["Inter"],
        "body-md": ["Inter"],
        "body-sm": ["Inter"],
        "label-md": ["Inter"],
        "data-mono": ["Inter"]
      }
    }
  },
  plugins: [forms, containerQueries]
};

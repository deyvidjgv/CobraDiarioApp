/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        // Paleta premium minimalista — hueso + grafito
        primary: "#1A1917",        // grafito: texto fuerte y botones primarios
        "primary-light": "#3A3733",
        "primary-bg": "#EFECE6",
        gold: "#D9C9A3",           // champán: acento sobre fondos oscuros
        // Estados de crédito
        mora: "#B4653F",           // terracota
        "al-dia": "#5F7A5B",       // verde apagado
        adelanto: "#6E7F98",       // azul acero
        // Superficies
        surface: "#FFFFFF",
        "surface-1": "#F7F5F1",    // hueso
        "surface-2": "#EFECE6",
        line: "#E3DFD8",           // borde único de toda la app
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};

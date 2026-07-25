/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta Claude
        primary: "#26215C",
        "primary-light": "#7F77DD",
        "primary-bg": "#EEEDFE",
        gold: "#FAC775",
        // Estados de crédito
        mora: "#DC2626",
        "al-dia": "#FAC775",
        adelanto: "#3B82F6", // blue-500
        // Superficies
        surface: "#FFFFFF",
        "surface-1": "#F9F9FB",
        "surface-2": "#F3F3F6",
      },
    },
  },
  plugins: [],
};

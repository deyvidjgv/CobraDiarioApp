/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta de la app (tonos suaves)
        primary: "#5A52C5", // Índigo intermedio, más suave que el negro pero con contraste
        "primary-light": "#7F77DD", // Restauramos el tono pastel original de los botones
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

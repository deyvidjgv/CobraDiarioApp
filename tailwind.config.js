/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ['"Instrument Sans"', '"IBM Plex Sans"', "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        // Paleta premium — obsidiana + champán
        primary: "#F4F1EA",        // tinta principal: texto sobre obsidiana
        "primary-light": "#A5A096", // tinta secundaria
        "primary-bg": "#1B1A17",   // relleno sutil: chips, avatares
        gold: "#D9C9A3",           // champán: acento y acciones primarias
        // Estados de crédito, aclarados para leer sobre fondo oscuro
        mora: "#C87B54",           // terracota
        "al-dia": "#7E9A78",       // verde apagado
        adelanto: "#8FA3BC",       // azul acero
        // Superficies
        obsidian: "#0A0A09",       // barra lateral y paneles profundos
        surface: "#131311",        // tarjeta
        "surface-1": "#0E0E0D",    // fondo de página
        "surface-2": "#1B1A17",
        line: "#272621",           // borde único de toda la app
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
      spacing: {
        // Altura de la barra inferior (67px) más holgura, contando el área
        // segura del home indicator. Instalada como PWA en iPhone esa franja
        // añade ~34px, y los botones flotantes a `bottom-[92px]` quedaban
        // por debajo de la barra. Va en la config y no como clase suelta en
        // index.css para que siga respetando los breakpoints (lg:bottom-8).
        "nav-safe": "calc(92px + env(safe-area-inset-bottom, 0px))",
      },
    },
  },
  plugins: [],
};

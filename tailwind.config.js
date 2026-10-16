/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      screens: {
        // Login: el panel decorativo grande (logo+título+subtítulo
        // apilados) solo cabe si hay ancho Y alto de sobra. Un celular en
        // horizontal (ej. 844×390) supera los 640px de `sm` en ancho pero
        // tiene mucho menos de 600px de alto — con solo `sm` se le mostraba
        // el panel de escritorio en una pantalla demasiado baja para
        // contenerlo, y esa era la causa real del scroll.
        "tall-sm": { raw: "(min-width: 640px) and (min-height: 600px)" },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ['"Instrument Sans"', '"IBM Plex Sans"', "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        // Paleta clara — marfil + bronce. Todos los colores de la app salen
        // de estos tokens; los contrastes de texto cumplen WCAG AA (≥4.5:1)
        // sobre blanco, y `text-surface-1` sobre gold/mora/al-dia también.
        primary: "#1C1B17",        // tinta principal
        "primary-light": "#6B665C", // tinta secundaria
        "primary-bg": "#EEEAE1",   // relleno sutil: chips, avatares, fondo del login
        gold: "#86682F",           // bronce: acento y acciones primarias
        // Estados de crédito, oscurecidos para leer sobre fondo claro
        mora: "#B04A26",           // terracota
        "al-dia": "#4A7A45",       // verde
        adelanto: "#46698F",       // azul acero
        // Superficies
        obsidian: "#FDFCFA",       // barra lateral (nombre heredado del tema oscuro)
        surface: "#FFFFFF",        // tarjeta
        "surface-1": "#F6F5F1",    // fondo de página; también texto sobre acentos
        "surface-2": "#F0EDE6",    // hover / relleno secundario
        line: "#E4E0D6",           // borde único de toda la app
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

/**
 * Marca CrediDev: gema de trazo champán, dibujada como SVG para que quede
 * nítida en cualquier tamaño y herede el color del contexto. Sustituye al PNG
 * rasterizado, que traía fondo propio y se recortaba como caja sobre la
 * superficie oscura.
 *
 * Las facetas (faja horizontal + los dos cortes hacia la punta inferior) son
 * las mismas del ícono de la app: sin ellas el rombo queda vacío y se pierde
 * al lado del logotipo.
 */
export default function Logo({ size = 26, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
      className={"text-gold " + className}
    >
      {/* contorno del rombo */}
      <path d="M12 2.4 21.6 12 12 21.6 2.4 12Z" />
      {/* faja y cortes inferiores */}
      <path d="M5.28 9.12h13.44" />
      <path d="M5.28 9.12 12 21.6" />
      <path d="M18.72 9.12 12 21.6" />
    </svg>
  );
}

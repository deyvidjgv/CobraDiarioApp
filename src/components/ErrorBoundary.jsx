import { Component } from "react";
import { IconAlertTriangle } from "@tabler/icons-react";

/**
 * Red de seguridad raíz: sin esto, una excepción no capturada durante el
 * render (ej. un documento con un campo corrupto que rompe un cálculo)
 * deja al usuario con una pantalla en blanco sin ninguna pista de qué pasó.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-surface-1 flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-surface border border-line rounded-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-mora/10 flex items-center justify-center mx-auto">
            <IconAlertTriangle size={24} stroke={1.5} className="text-mora" />
          </div>
          <div>
            <p className="font-semibold text-primary">Algo salió mal</p>
            <p className="text-sm text-primary-light/75 mt-1">
              Ocurrió un error inesperado. Tus datos están a salvo — intenta recargar la página.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full bg-gold text-surface-1 font-medium rounded-xl py-3 hover:bg-gold/90 transition"
          >
            Recargar
          </button>
        </div>
      </div>
    );
  }
}

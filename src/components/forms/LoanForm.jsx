import { useState, useEffect } from "react";
import FrequencySelector from "../ui/FrequencySelector";
import { calcularTotalesCredito } from "../../logic/credito";
import { calcularSeguro } from "../../logic/seguro";
import { formatearMonto, limpiarMonto, bloquearEntradaSoloNumeros, bloquearEntradaSoloNumerosConDecimal } from "../../logic/formato";

export default function LoanForm({ clients = [], settings = {}, onSubmit, loading = false, onClientChange }) {
  const [form, setForm] = useState({
    clientId: "",
    capital: "",
    interes: settings.interesDefault ?? 20,
    numeroCuotas: "",
    frecuencia: "diario",
    fechaInicio: new Date().toISOString().split("T")[0],
    seguroActivo: settings.seguroActivo ?? false,
    seguroTipo: settings.seguroTipo ?? "porcentaje",
    seguroValor: settings.seguroValor ?? 5,
    vencimientoActivo: settings.vencimientoActivo ?? false,
    vencimientoModoInicial: settings.vencimientoModoInicial ?? "al_vencer",
    vencimientoPorcentaje: settings.vencimientoPorcentaje ?? 20,
  });

  // Actualizar valores cuando se carguen los settings
  useEffect(() => {
    if (settings) {
      setForm((f) => ({ 
        ...f, 
        interes: settings.interesDefault ?? f.interes,
        seguroActivo: settings.seguroActivo ?? f.seguroActivo,
        seguroTipo: settings.seguroTipo ?? f.seguroTipo,
        seguroValor: settings.seguroValor ?? f.seguroValor,
        vencimientoActivo: settings.vencimientoActivo ?? f.vencimientoActivo,
        vencimientoModoInicial: settings.vencimientoModoInicial ?? f.vencimientoModoInicial,
        vencimientoPorcentaje: settings.vencimientoPorcentaje ?? f.vencimientoPorcentaje,
      }));
    }
  }, [settings]);

  const preview =
    form.capital && form.numeroCuotas
      ? calcularTotalesCredito(Number(form.capital), Number(form.interes), Number(form.numeroCuotas))
      : null;

  function set(field, isMonto = false) {
    return (e) => {
      const value = isMonto ? limpiarMonto(e.target.value) : e.target.value;
      setForm({ ...form, [field]: value });
      if (field === "clientId" && onClientChange) {
        onClientChange(value);
      }
    };
  }

  function handleSubmit(e) {
    e.preventDefault();

    const capital = Number(form.capital);
    const interes = Number(form.interes);
    const numeroCuotas = Number(form.numeroCuotas);
    const seguroValor = Number(form.seguroValor);
    const vencimientoPorcentaje = Number(form.vencimientoPorcentaje);

    if (!Number.isFinite(capital) || capital <= 0) {
      alert("El capital debe ser un número válido y mayor a cero.");
      return;
    }

    if (!Number.isFinite(interes) || interes < 0) {
      alert("El interés debe ser un número válido.");
      return;
    }

    if (!Number.isFinite(numeroCuotas) || numeroCuotas < 1) {
      alert("El número de cuotas debe ser al menos 1.");
      return;
    }

    const vencimiento = {
      activo: form.vencimientoActivo,
      modoInicial: form.vencimientoModoInicial,
      porcentaje: vencimientoPorcentaje,
    };

    onSubmit({
      ...form,
      capital,
      interes,
      numeroCuotas,
      fechaInicio: new Date(form.fechaInicio + "T00:00:00"),
      seguroValor,
      vencimiento,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Cliente */}
      <label className="block">
        <span className="text-sm font-medium text-gray-700">Cliente *</span>
        <select
          required
          value={form.clientId}
          onChange={set("clientId")}
          className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition bg-white"
        >
          <option value="">Seleccionar cliente</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </label>

      {/* Capital + Interés */}
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Capital ($) *</span>
          <input
            type="text"
            inputMode="numeric"
            required
            value={form.capital ? formatearMonto(form.capital) : ""}
            onChange={set("capital", true)}
            onKeyDown={bloquearEntradaSoloNumeros}
            className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
            placeholder="100.000"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Interés (%) *</span>
          <input
            type="number"
            required
            min="0"
            step="0.1"
            value={form.interes}
            onChange={set("interes")}
            onKeyDown={bloquearEntradaSoloNumerosConDecimal}
            className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
          />
        </label>
      </div>

      {/* Cuotas + Fecha */}
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">N° cuotas *</span>
          <input
            type="number"
            required
            min="1"
            value={form.numeroCuotas}
            onChange={set("numeroCuotas")}
            onKeyDown={bloquearEntradaSoloNumeros}
            className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
            placeholder="20"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Fecha inicio *</span>
          <input
            type="date"
            required
            value={form.fechaInicio}
            onChange={set("fechaInicio")}
            className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
          />
        </label>
      </div>

      {/* Frecuencia */}
      <div>
        <span className="text-sm font-medium text-gray-700 mb-2 block">Frecuencia de cobro *</span>
        <FrequencySelector value={form.frecuencia} onChange={(v) => setForm({ ...form, frecuencia: v })} />
      </div>

      {/* Seguro Opcional */}
      <div className="bg-white rounded-xl p-4 border border-[#E5E5EA] space-y-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.seguroActivo}
            onChange={(e) => setForm({ ...form, seguroActivo: e.target.checked })}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm font-medium text-gray-800">Cobrar seguro / comisión inicial</span>
        </label>
        {form.seguroActivo && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <label className="block">
              <span className="text-xs text-gray-500">Tipo</span>
              <select
                value={form.seguroTipo}
                onChange={set("seguroTipo")}
                className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-3 py-2 text-sm bg-white"
              >
                <option value="porcentaje">Porcentaje (%)</option>
                <option value="fijo">Monto Fijo ($)</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500">Valor</span>
              <input
                type="number"
                min="0"
                step={form.seguroTipo === "porcentaje" ? "0.1" : "1"}
                value={form.seguroValor}
                onChange={set("seguroValor")}
                onKeyDown={bloquearEntradaSoloNumerosConDecimal}
                className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-3 py-2 text-sm"
              />
            </label>
          </div>
        )}
      </div>

      {/* Vencimiento Opcional */}
      <div className="bg-white rounded-xl p-4 border border-[#E5E5EA] space-y-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.vencimientoActivo}
            onChange={(e) => setForm({ ...form, vencimientoActivo: e.target.checked })}
            className="rounded border-gray-300 text-red-500 focus:ring-red-500"
          />
          <span className="text-sm font-medium text-gray-800">Penalidad por vencimiento (Mora)</span>
        </label>
        {form.vencimientoActivo && (
          <div className="pt-2">
            <label className="block">
              <span className="text-xs text-gray-500">Recargo por mora (%) - Aplica únicamente al vencer el plazo total</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.vencimientoPorcentaje}
                onChange={set("vencimientoPorcentaje")}
                onKeyDown={bloquearEntradaSoloNumerosConDecimal}
                className="mt-1 block w-full sm:w-1/2 rounded-xl border border-[#E5E5EA] px-3 py-2 text-sm"
              />
            </label>
          </div>
        )}
      </div>

      {/* Preview */}
      {preview && (() => {
        const numCuotas = Number(form.numeroCuotas) || 0;
        const cuota = preview.cuota;
        const totalBase = preview.montoTotalAPagar;

        // Seguro
        let seguroMonto = 0;
        let netoCliente = Number(form.capital);
        if (form.seguroActivo) {
          const seg = calcularSeguro(Number(form.capital), {
            activo: true,
            tipo: form.seguroTipo,
            valor: Number(form.seguroValor),
          });
          seguroMonto = seg.seguroMonto;
          netoCliente = seg.totalARecibirCliente;
        }

        return (
          <div className="bg-primary/5 rounded-xl p-4 space-y-2">
            <p className="text-xs font-medium text-primary/60">Vista previa del crédito</p>

            {/* Total a pagar */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 font-medium">Total a pagar:</span>
              <span className="font-bold text-primary text-base">${formatearMonto(totalBase)}</span>
            </div>

            {/* Cuota */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Cuota ({numCuotas} × {form.frecuencia}):</span>
              <span className="font-medium text-primary-light">${formatearMonto(cuota)}</span>
            </div>

            {/* Información sobre penalidad */}
            {form.vencimientoActivo && (
              <div className="text-[11px] text-gray-500 bg-white/50 rounded-lg px-2.5 py-2 mt-2 border border-gray-100">
                <span className="font-medium text-gray-600">Info:</span> Se configuró penalidad por mora ({form.vencimientoPorcentaje}% {form.vencimientoModoInicial === "mensual" ? "mensual" : "al vencer el plazo"}). Esto solo aplicará en el futuro si el cliente presenta mora, no altera el plan original.
              </div>
            )}

            {/* Seguro */}
            {form.seguroActivo && (
              <>
                <div className="flex justify-between text-sm border-t border-primary/10 pt-2 mt-2">
                  <span className="text-gray-600">Cobro por seguro:</span>
                  <span className="font-medium text-red-500">-${formatearMonto(seguroMonto)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cliente recibe (neto):</span>
                  <span className="font-medium text-emerald-600">${formatearMonto(netoCliente)}</span>
                </div>
              </>
            )}
          </div>
        );
      })()}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary hover:bg-primary-light text-white font-medium rounded-xl py-3 transition disabled:opacity-50"
      >
        {loading ? "Guardando..." : "Crear crédito"}
      </button>
    </form>
  );
}

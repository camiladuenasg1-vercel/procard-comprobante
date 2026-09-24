import { Check, ReceiptText, ShieldCheck } from "lucide-react";

const gs = new Intl.NumberFormat("es-PY", {
  style: "currency",
  currency: "PYG",
  maximumFractionDigits: 0,
});

const CANAL_LABEL: Record<string, string> = {
  tap2phone: "Tap para cobrar",
  pago_link: "Link de pago",
  qr: "QR",
};

/**
 * Comprobante público — se llega acá escaneando el QR que el comercio ve en
 * el recibo digital de la SuperApp (por ahora, sólo Tap2Phone: es tarjeta
 * presente, el gesto de "mostrar/escanear un comprobante" es el que ya
 * conoce cualquiera que use un POS real). No hay backend: todos los datos
 * viajan codificados en la URL del QR — mismo criterio que
 * procard-superapp/src/app/(app)/comprobante ya usaba antes de este repo.
 * Ver README.md para el detalle de esa decisión y sus límites como
 * prototipo.
 */
export default async function ComprobantePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await searchParams;
  const get = (k: string) => {
    const v = p[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const ref = get("ref");
  const monto = get("monto");
  const canal = get("canal");
  const marca = get("marca");
  const tarjeta = get("tarjeta");
  const fecha = get("fecha");

  if (!ref || !monto) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <ReceiptText className="size-6" />
        </span>
        <p className="text-base font-semibold">No encontramos un comprobante acá</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Escaneá el código QR que aparece en el recibo digital de la SuperApp
          PROCARD justo después de un cobro.
        </p>
      </main>
    );
  }

  const montoNum = Number(monto);
  const fechaFmt = fecha
    ? new Date(fecha).toLocaleString("es-PY", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const rows: [string, string][] = [
    ["N.º de operación", ref],
    ["Canal", (canal && CANAL_LABEL[canal.toLowerCase()]) ?? canal ?? "—"],
    ...(marca && tarjeta
      ? ([["Tarjeta", `${marca} ····${tarjeta}`]] as [string, string][])
      : []),
    ...(fechaFmt ? ([["Fecha y hora", fechaFmt]] as [string, string][]) : []),
  ];

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="bg-primary px-6 pb-8 pt-7 text-center text-primary-foreground">
          <p className="text-xs font-medium uppercase tracking-wide opacity-80">
            PROCARD
          </p>
          <span className="mx-auto mt-4 flex size-14 items-center justify-center rounded-full bg-white/15">
            <Check className="size-7" strokeWidth={3} />
          </span>
          <p className="mt-3 text-sm font-medium opacity-90">Cobro aprobado</p>
          <p className="mt-1 font-mono text-[34px] font-bold leading-none tracking-tight">
            {Number.isFinite(montoNum) ? gs.format(montoNum) : monto}
          </p>
        </div>

        <dl className="divide-y divide-border text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 px-5 py-3">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="flex items-start gap-2 border-t border-border bg-muted/40 px-5 py-3.5 text-left text-[11px] leading-snug text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
          Comprobante generado por PROCARD para esta operación. Prototipo de
          demostración — el cobro no procesó un pago real.
        </div>
      </div>
    </main>
  );
}

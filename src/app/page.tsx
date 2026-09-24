import type { Metadata } from "next";
import Link from "next/link";
import {
  Check,
  Hash,
  Radio,
  CreditCard,
  CalendarClock,
  Store,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Comprobante PROCARD",
  // Página pública con importes y números de operación: no debe indexarse.
  robots: { index: false, follow: false },
};

const gs = new Intl.NumberFormat("es-PY", {
  style: "currency",
  currency: "PYG",
  maximumFractionDigits: 0,
});

/**
 * Quien lee esta pantalla es el CLIENTE que pagó, no el comercio: los canales
 * se nombran desde su lado ("pago sin contacto", no "tap para cobrar").
 *
 * Es un Map y no un objeto literal a propósito: con `Record` un `canal` como
 * `constructor` o `__proto__` devolvía algo heredado de Object.prototype y
 * React reventaba con 500 al intentar renderizar una función como hijo.
 */
const CANAL_LABEL = new Map([
  ["tap2phone", "Pago sin contacto"],
  ["pago_link", "Link de pago"],
  ["qr", "QR"],
]);

type Brand = { slug: string; label: string; file: string };
const OPEN_BRANDS: Brand[] = [
  { slug: "visa", label: "Visa", file: "visa.png" },
  { slug: "mastercard", label: "Mastercard", file: "mastercard.png" },
];
const PROCARD_BRANDS: Brand[] = [
  { slug: "unica", label: "Única", file: "unica.jpg" },
  { slug: "credicard", label: "Credicard", file: "credicard.png" },
];

/**
 * Comprobante público — se llega acá escaneando el QR que el comercio ve en
 * el recibo digital de la SuperApp (por ahora, sólo Tap2Phone: es tarjeta
 * presente, el gesto de "mostrar/escanear un comprobante" es el que ya
 * conoce cualquiera que use un POS real). No hay backend: todos los datos
 * viajan codificados en la URL del QR — ver README.md para el detalle de
 * esa decisión y sus límites como prototipo.
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
  const canal = get("canal")?.trim().toLowerCase() || null;
  const marca = get("marca")?.trim() || null;
  const tarjeta = get("tarjeta")?.trim() || null;
  const fecha = get("fecha");
  const comercio = get("comercio")?.trim() || null;

  // El importe tiene que ser un entero positivo de guaraníes. Sin esta guarda
  // `monto=abc`, `-5000`, `0` o `Infinity` se imprimían crudos a 36px en el
  // lugar donde va la plata.
  const montoNum = /^\d+$/.test(monto ?? "") ? Number(monto) : NaN;
  if (!ref || !Number.isSafeInteger(montoNum) || montoNum <= 0) {
    return <EmptyState />;
  }

  // Asunción, no UTC: con `fecha` en Z el comprobante mostraba la hora (y a
  // veces el día) equivocados para quien lo está leyendo acá.
  const fechaDate = fecha ? new Date(fecha) : null;
  const fechaFmt =
    fechaDate && !Number.isNaN(fechaDate.getTime())
      ? fechaDate.toLocaleString("es-PY", {
          timeZone: "America/Asuncion",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  const rows: { icon: typeof Hash; label: string; value: string }[] = [
    ...(comercio ? [{ icon: Store, label: "Comercio", value: comercio }] : []),
    { icon: Hash, label: "N.º de operación", value: ref },
    {
      icon: Radio,
      label: "Canal",
      value: (canal && CANAL_LABEL.get(canal)) ?? "—",
    },
    // Solo los últimos 4 dígitos, aunque el QR mande el PAN entero.
    ...(tarjeta
      ? [
          {
            icon: CreditCard,
            label: "Tarjeta",
            value: `${marca ? `${marca} ` : ""}····${tarjeta.slice(-4)}`,
          },
        ]
      : []),
    ...(fechaFmt ? [{ icon: CalendarClock, label: "Fecha y hora", value: fechaFmt }] : []),
  ];

  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden px-4 py-10 sm:py-14">
      <Backdrop />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-5">
        <header className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brands/redpro-color.png"
            alt="PROCARD"
            width={28}
            height={28}
            className="shrink-0"
          />
          <span className="text-sm font-bold tracking-wide text-foreground">
            PROCARD
          </span>
        </header>

        <div className="w-full overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_20px_60px_-15px_rgba(30,92,63,0.35)]">
          <div className="relative bg-primary px-6 pb-9 pt-8 text-center text-primary-foreground">
            <WaveDivider />
            <span className="relative mx-auto flex size-16 items-center justify-center rounded-full bg-white/15 ring-4 ring-white/10">
              <Check className="size-8" strokeWidth={3} />
            </span>
            <p className="relative mt-3 text-sm font-medium opacity-85">
              Pago aprobado
            </p>
            <p className="relative mt-1 font-mono text-[36px] font-bold leading-none tracking-tight">
              {gs.format(montoNum)}
            </p>
          </div>

          <dl className="divide-y divide-border px-2 py-2 text-sm">
            {rows.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="size-4" />
                </span>
                <dt className="shrink-0 text-muted-foreground">{label}</dt>
                <dd className="min-w-0 flex-1 break-all text-right font-semibold">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          {/* Marcas aceptadas — abiertas (Visa/Mastercard) para Tap2Phone,
              propias de PROCARD (Única/Credicard) para el resto. */}
          <div className="flex items-center justify-center gap-4 border-t border-border bg-muted/40 px-5 py-4">
            {(canal === "qr" || canal === "pago_link" ? PROCARD_BRANDS : OPEN_BRANDS).map(
              (b) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={b.slug}
                  src={`/brands/${b.file}`}
                  alt={b.label}
                  className="h-[18px] w-auto object-contain opacity-90"
                />
              ),
            )}
          </div>

          <div className="flex items-start gap-2 border-t border-border px-5 py-3.5 text-left text-[11px] leading-snug text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            Comprobante generado por PROCARD para esta operación. Prototipo
            de demostración — no se procesó un pago real.
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground">
          Guardá o compartí este comprobante — no necesita cuenta.
        </p>
      </div>
    </main>
  );
}

function EmptyState() {
  const sampleUrl =
    "/?" +
    new URLSearchParams({
      ref: "OP-DEMO" + Math.random().toString(36).slice(2, 6).toUpperCase(),
      monto: "185000",
      canal: "tap2phone",
      comercio: "Panadería Villa Morra",
      marca: "Visa",
      tarjeta: "4242",
      fecha: new Date().toISOString(),
    }).toString();

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-10 text-center">
      <Backdrop />
      <div className="relative z-10 flex w-full max-w-xs flex-col items-center gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brands/redpro-color.png"
          alt="PROCARD"
          width={56}
          height={56}
        />
        <div>
          <p className="text-base font-bold">Comprobante PROCARD</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Escaneá el código QR que aparece en el recibo digital de la
            SuperApp justo después de un cobro para ver el comprobante acá.
          </p>
        </div>
        <Link
          href={sampleUrl}
          className="mt-2 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-[0.97]"
        >
          <Sparkles className="size-4" />
          Simular visualización de comprobante
        </Link>
        <p className="text-[11px] text-muted-foreground">
          Genera un comprobante de ejemplo — no necesita escanear nada.
        </p>
      </div>
    </main>
  );
}

/** Fondo decorativo — blobs suaves en los colores de marca, sin librerías. */
function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div
        className="absolute -top-24 -left-20 size-72 rounded-full opacity-[0.16] blur-3xl"
        style={{ background: "radial-gradient(circle, #1e5c3f, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-28 -right-16 size-80 rounded-full opacity-[0.14] blur-3xl"
        style={{ background: "radial-gradient(circle, #e3a73c, transparent 70%)" }}
      />
      <div
        className="absolute top-1/3 right-0 size-56 rounded-full opacity-[0.10] blur-3xl"
        style={{ background: "radial-gradient(circle, #d7d400, transparent 70%)" }}
      />
    </div>
  );
}

/** Ola sutil en el borde inferior del header — mismo lenguaje visual que la
    SuperApp (capas de onda en verde/dorado) sin cargar assets extra. */
function WaveDivider() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 16"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 -bottom-px h-4 w-full text-card"
    >
      <path
        d="M0 8 Q 25 16 50 8 T 100 8 T 150 8 T 200 8 V16 H0 Z"
        fill="currentColor"
      />
    </svg>
  );
}

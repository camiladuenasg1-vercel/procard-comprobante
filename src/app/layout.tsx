import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Comprobante PROCARD",
  description: "Comprobante de pago PROCARD",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "ClienteZero",
  description: "Automacao de Pagamentos IPTV/ISP",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

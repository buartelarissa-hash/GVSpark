import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "GV SPARK", template: "%s · GV SPARK" },
  description: "GV SPARK — Desperte seu potencial. Plataforma de integração e aprendizagem da Gigavale Atacado.",
  icons: { icon: "/brand/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#08234A" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}

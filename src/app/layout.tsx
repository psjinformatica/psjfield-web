import type { Metadata, Viewport } from "next";
import { CircleDollarSign, FileUp, LayoutDashboard } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "PSJField", template: "%s · PSJField" },
  description: "Gestão mobile de chamados técnicos da PSJ Informática.",
  applicationName: "PSJField",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "PSJField", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0F3D63",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <PwaRegister />
        <header className="topbar app-header">
          <Link className="brand" href="/" aria-label="PSJField — início">
            <Image
              className="brand-logo app-logo"
              src="/psj-logo.png"
              alt="PSJ Informática"
              width={512}
              height={288}
              priority
            />
          </Link>
          <nav aria-label="Navegação principal">
            <Link href="/"><LayoutDashboard size={18} /> Chamados</Link>
            <Link href="/importar"><FileUp size={18} /> Importar</Link>
            <Link href="/financeiro"><CircleDollarSign size={18} /> Financeiro</Link>
          </nav>
        </header>
        {children}
        <nav className="mobile-nav" aria-label="Navegação móvel">
          <Link href="/"><LayoutDashboard size={20} /><span>Chamados</span></Link>
          <Link href="/importar"><FileUp size={20} /><span>Importar</span></Link>
          <Link href="/financeiro"><CircleDollarSign size={20} /><span>Financeiro</span></Link>
        </nav>
      </body>
    </html>
  );
}

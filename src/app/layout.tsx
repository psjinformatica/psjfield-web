import type { Metadata, Viewport } from "next";
import { FileUp, LayoutDashboard } from "lucide-react";
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
};

export const viewport: Viewport = {
  themeColor: "#123f33",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <PwaRegister />
        <header className="topbar">
          <Link className="brand" href="/" aria-label="PSJField — início">
            <Image
              className="brand-logo"
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
          </nav>
        </header>
        {children}
        <nav className="mobile-nav" aria-label="Navegação móvel">
          <Link href="/"><LayoutDashboard size={20} /><span>Chamados</span></Link>
          <Link href="/importar"><FileUp size={20} /><span>Importar</span></Link>
        </nav>
      </body>
    </html>
  );
}

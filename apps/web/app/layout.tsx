import type { Metadata, Viewport } from "next";
import "./globals.css";
import TopBar from "../components/TopBar";

export const metadata: Metadata = {
  title: "PAL COTEJO — Reservas Sport Bar & Cancha",
  description: "Reserva tu cancha sintética y tu mesa en el sport bar",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#070b14",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <TopBar />
        {children}
      </body>
    </html>
  );
}

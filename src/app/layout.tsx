import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Suivi de Colis",
  description: "Suivez vos colis en temps réel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AlterNative",
  description: "Plateforme de soumission et publication de manuscrits",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

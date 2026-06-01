import type { Metadata } from "next";
import "@fontsource/archivo-black";
import "@fontsource/space-grotesk";
import "@fontsource/jetbrains-mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Thread Pool Control Board",
  description: "Neo-Brutalism presentation UI for our thread pool project",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`} style={{
        "--font-sans": "'Space Grotesk', sans-serif",
        "--font-heading": "'Archivo Black', sans-serif",
        "--font-mono": "'JetBrains Mono', monospace",
      } as React.CSSProperties}>
        {children}
      </body>
    </html>
  );
}
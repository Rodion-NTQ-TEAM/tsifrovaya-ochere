import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Электронная очередь Почты России",
  description: "MVP системы управления очередью нового поколения без бумажных талонов",
};

export default function RootLayout({ children, }: Readonly<{ children: React.ReactNode; }>) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
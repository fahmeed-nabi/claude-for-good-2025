import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "TeachTwin",
  description: "AI professor twin for educational support",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProfitScope",
  description: "決算可視化ダッシュボード",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

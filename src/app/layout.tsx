import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "특허명세서 자동작성 MVP",
  description: "국내 특허출원용 명세서 초안 자동작성 MVP"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

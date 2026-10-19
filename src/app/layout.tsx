import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Elections",
  description: "Research 2026 California candidates",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">Elections 2026</Link>
          <Link href="/" className="nav-link">Races</Link>
          <Link href="/preferences" className="nav-link">My Priorities</Link>
          <Link href="/sources" className="nav-link">Sources</Link>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { favicons } from "@/lib/site";

export const viewport: Viewport = {
  themeColor: "#12110f",
};

// Next.js does not add the base path to metadata URLs, so the icons name their published paths.
export const metadata: Metadata = {
  icons: { icon: favicons },
};

/*
 * Each page brings its own stylesheet and links the other with a plain <a>, so moving between them loads a fresh
 * document: the two stylesheets share class names (.mast, .brand, .cols, .foot) and must never meet in one page.
 * The opening sets a class on <html> before React hydrates, hence suppressHydrationWarning.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

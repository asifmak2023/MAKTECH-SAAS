import type { Metadata } from "next";
import "./globals.css";
import CreatorCredit from "@/components/CreatorCredit";
import SupportWidget from "@/components/SupportWidget";
import { ThemeBoot } from "@/lib/theme";

export const metadata: Metadata = {
  title: "FBR Digital Invoicing System",
  description: "FBR / PRAL digital invoicing for Pakistani businesses",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var allowed=["fbr","asifent","editorial","glacier","mehndi","karachi","rosewood","indigo"];var p=localStorage.getItem("pral_palette")||"fbr";if(allowed.indexOf(p)<0)p="fbr";document.documentElement.setAttribute("data-palette",p);var t=localStorage.getItem("pral_theme");var dark=p==="glacier"||(p!=="editorial"&&t==="dark");if(p==="editorial")dark=false;document.documentElement.setAttribute("data-mode",dark?"dark":"light");document.documentElement.classList.toggle("dark",dark);document.documentElement.style.colorScheme=dark?"dark":"light";}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeBoot />
        {children}
        <SupportWidget />
        <CreatorCredit />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import CreatorCredit from "@/components/CreatorCredit";
import SupportWidget from "@/components/SupportWidget";

export const metadata: Metadata = {
  title: "FBR Digital Invoicing System",
  description: "FBR / PRAL digital invoicing for Pakistani businesses",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-palette="fbr" data-mode="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=localStorage.getItem("pral_palette")||"fbr";if(["fbr","asifent","editorial","glacier"].indexOf(p)<0)p="fbr";document.documentElement.setAttribute("data-palette",p);var t=localStorage.getItem("pral_theme");var dark=p==="glacier"||(p!=="editorial"&&t==="dark");if(p==="editorial")dark=false;document.documentElement.setAttribute("data-mode",dark?"dark":"light");if(p==="fbr"&&dark)document.documentElement.classList.add("dark");}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        {children}
        <SupportWidget />
        <CreatorCredit />
      </body>
    </html>
  );
}

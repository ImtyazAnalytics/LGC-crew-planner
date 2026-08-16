import "./globals.css";
import PwaRegister from "./pwa-register";

export const metadata = {
  title: "LGC Crew Planning Portal",
  description: "Crew availability, scheduling, requests, reporting and management analytics.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/lgc-app-icon-192.png",
    apple: "/lgc-app-icon-192.png"
  }
};

export const viewport = {
  themeColor: "#12385d"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><PwaRegister />{children}</body>
    </html>
  );
}

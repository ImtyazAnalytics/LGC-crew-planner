import "./globals.css";

export const metadata = {
  title: "LGC Global | Crew Planner",
  description: "Simple crew availability and scheduling"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

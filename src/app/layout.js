import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Splitzy – Bill Splitter",
  description: "Easily split bills and track expenses with friends.",
  icons: {
    icon: "/apple-icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen justify-between`}
      >
        <main className="flex-grow flex items-center justify-center">
          {children}
        </main>

        <footer className="text-center py-4 text-sm text-gray-500 border-t">
          Created by{" "}
          <a
            href="www.linkedin.com/in/devik-nangia-862225329"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            Devik Nangia
          </a>
        </footer>
      </body>
    </html>
  );
}

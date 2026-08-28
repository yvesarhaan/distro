import "./globals.css";

export const metadata = {
  title: "Distro",
  description: "Upload once. Let the platform handle the rest.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

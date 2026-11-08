import type { Metadata } from 'next';
import '@radix-ui/themes/styles.css';
import '../styles/light-theme.css';

export const metadata: Metadata = {
  title: 'Workbench Demo',
  description: 'Demo application for the plugin-based workbench',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}

import './globals.css';

export const metadata = {
  title: 'Stock Detection Dashboard',
  description: 'Real-time inventory monitoring system',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
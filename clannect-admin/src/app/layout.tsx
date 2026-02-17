import './globals.css'

export const metadata = {
  title: 'Clannect Admin Panel',
  description: 'Admin Panel for Clannect',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

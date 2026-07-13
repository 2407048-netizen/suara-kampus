import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Script from 'next/script';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import Footer from '@/components/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Suara Kampus - ITGarut',
  description: 'Sistem Pengaduan & Aspirasi Mahasiswa Terpadu',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;
  let user = null;
  if (token) {
    user = await verifyJWT(token);
  }

  return (
    <html lang="id">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        
        {/* Bootstrap 5 CSS */}
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
        
        {/* Font Awesome */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
        
        {/* SweetAlert2 */}
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css" />
        
        {/* CSS styles di globals.css agar rapi dan sama persis dengan tag <style> di base.html */}
      </head>
      <body className={inter.className} style={{ background: '#F8F9FA', paddingTop: '78px', paddingBottom: '80px' }}>
        
        <Navbar user={user} />

        {/* MAIN CONTENT */}
        <div className="container page-shell py-4">
          {children}
        </div>

        <BottomNav user={user} />
        
        <Footer />

        {/* Scripts */}
        <Script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js" strategy="lazyOnload" />
        <Script src="https://cdn.jsdelivr.net/npm/sweetalert2@11" strategy="lazyOnload" />
        
        {/* Pusher replaces Socket.io for Vercel Serverless environment */}
        <Script src="https://js.pusher.com/7.2/pusher.min.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}

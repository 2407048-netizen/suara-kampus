'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav({ user }: { user: any }) {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav d-md-none">
        <div className="container-fluid d-flex justify-content-around align-items-end px-2">
            {user ? (
                <>
                    {/* User Login */}
                    <Link href="/dashboard" className={`bottom-nav-item ${pathname === '/dashboard' ? 'active' : ''}`}>
                        <i className="fas fa-home"></i>
                        <span>Home</span>
                    </Link>
                    
                    <Link href="/dashboard" className="bottom-nav-item">
                        <i className="fas fa-file-alt"></i>
                        <span>Laporan</span>
                    </Link>
                    
                    {/* FAB Button - Buat Laporan */}
                    <Link href="/buat-pengaduan" className="bottom-nav-fab">
                        <i className="fas fa-plus"></i>
                    </Link>
                    
                    <Link href="/riwayat-aspirasi" className={`bottom-nav-item ${pathname === '/riwayat-aspirasi' ? 'active' : ''}`}>
                        <i className="fas fa-lightbulb"></i>
                        <span>Aspirasi</span>
                    </Link>
                    
                    <Link href="/dashboard" className="bottom-nav-item">
                        <i className="fas fa-user"></i>
                        <span>Profil</span>
                    </Link>
                </>
            ) : (
                <>
                    {/* User Tamu */}
                    <Link href="/" className={`bottom-nav-item ${pathname === '/' ? 'active' : ''}`}>
                        <i className="fas fa-home"></i>
                        <span>Home</span>
                    </Link>
                    
                    <Link href="/faq" className={`bottom-nav-item ${pathname === '/faq' ? 'active' : ''}`}>
                        <i className="fas fa-question-circle"></i>
                        <span>FAQ</span>
                    </Link>
                    
                    <Link href="/login" className={`bottom-nav-item ${pathname === '/login' ? 'active' : ''}`}>
                        <i className="fas fa-sign-in-alt"></i>
                        <span>Login</span>
                    </Link>
                    
                    <Link href="/register" className={`bottom-nav-item ${pathname === '/register' ? 'active' : ''}`}>
                        <i className="fas fa-user-plus"></i>
                        <span>Daftar</span>
                    </Link>
                </>
            )}
        </div>
    </nav>
  );
}

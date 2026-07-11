'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Navbar({ user }: { user: any }) {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navbar navbar-expand-lg navbar-custom fixed-top ${isScrolled ? 'shadow-sm' : ''}`}>
      <div className="container">
        <Link href="/" className="navbar-brand d-flex align-items-center text-white">
          <div className="logo-img d-flex align-items-center justify-content-center">
            <span className="fw-bold text-primary" style={{ fontSize: '1.2rem' }}>ITG</span>
          </div>
          Suara Kampus
        </Link>
        <button className="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-center">
            <li className="nav-item">
              <Link href="/" className={`nav-link text-white ${pathname === '/' ? 'fw-bold' : 'opacity-75'}`}>
                Beranda
              </Link>
            </li>
            <li className="nav-item">
              <Link href="/faq" className={`nav-link text-white ${pathname === '/faq' ? 'fw-bold' : 'opacity-75'}`}>
                FAQ
              </Link>
            </li>
            <li className="nav-item">
              <Link href="/stats" className={`nav-link text-white ${pathname === '/stats' ? 'fw-bold' : 'opacity-75'}`}>
                Statistik
              </Link>
            </li>
            
            {user ? (
              <li className="nav-item dropdown ms-lg-3 mt-3 mt-lg-0">
                <a className="nav-link dropdown-toggle text-white d-flex align-items-center bg-white bg-opacity-10 px-3 py-2 rounded-pill" 
                   href="#" role="button" data-bs-toggle="dropdown">
                  <div className="rounded-circle bg-white text-primary d-flex align-items-center justify-content-center me-2" 
                       style={{ width: '28px', height: '28px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    {user.nama ? user.nama.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="me-1">{user.nama}</span>
                </a>
                <ul className="dropdown-menu dropdown-menu-end shadow border-0 mt-2 rounded-4">
                  <li><h6 className="dropdown-header">Login sebagai: {user.role}</h6></li>
                  {user.role === 'admin' || user.role === 'staff' ? (
                    <>
                      <li><Link className="dropdown-item py-2" href="/admin/dashboard"><i className="fas fa-chart-line fa-fw me-2 text-primary"></i> Dashboard Admin</Link></li>
                      <li><Link className="dropdown-item py-2" href="/admin/reports"><i className="fas fa-list-alt fa-fw me-2 text-info"></i> Kelola Laporan</Link></li>
                      <li><Link className="dropdown-item py-2" href="/admin/laporan-dosen"><i className="fas fa-chalkboard-teacher fa-fw me-2 text-warning"></i> Laporan Dosen</Link></li>
                    </>
                  ) : (
                    <>
                      <li><Link className="dropdown-item py-2" href="/dashboard"><i className="fas fa-columns fa-fw me-2 text-primary"></i> Dashboard</Link></li>
                      <li><Link className="dropdown-item py-2" href="/buat-pengaduan"><i className="fas fa-edit fa-fw me-2 text-success"></i> Buat Laporan</Link></li>
                      <li><Link className="dropdown-item py-2" href="/laporan-dosen"><i className="fas fa-chalkboard-teacher fa-fw me-2 text-warning"></i> Laporan Dosen</Link></li>
                    </>
                  )}
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <a className="dropdown-item py-2 text-danger" href="/api/auth/logout">
                      <i className="fas fa-sign-out-alt fa-fw me-2"></i> Keluar
                    </a>
                  </li>
                </ul>
              </li>
            ) : (
              <li className="nav-item ms-lg-3 mt-3 mt-lg-0">
                <Link href="/login" className="btn btn-light text-primary rounded-pill px-4 fw-bold shadow-sm">
                  Login <i className="fas fa-arrow-right ms-1"></i>
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

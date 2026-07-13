'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar({ user }: { user: any }) {
  const pathname = usePathname();

  return (
    <nav className="navbar navbar-expand-lg navbar-custom navbar-dark fixed-top">
        <div className="container">
            <Link className="navbar-brand d-flex align-items-center" href="/">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/logo-itg.png" alt="Logo ITG" className="logo-img" />
                <span>Suara Kampus</span>
            </Link>
            
            <button className="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span className="navbar-toggler-icon"></span>
            </button>
            
            <div className="collapse navbar-collapse" id="navbarNav">
                <ul className="navbar-nav ms-auto align-items-lg-center">
                    {user ? (
                        <>
                            {/* USER SUDAH LOGIN */}
                            <li className="nav-item">
                                <Link className="nav-link" href="/dashboard">
                                    <i className="fas fa-chart-line me-1"></i>Dashboard
                                </Link>
                            </li>
                            
                            {/* Dropdown Laporan */}
                            <li className="nav-item dropdown">
                                <a className="nav-link dropdown-toggle" href="#" id="laporanDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                                    <i className="fas fa-file-alt me-1"></i>Laporan
                                </a>
                                <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="laporanDropdown">
                                    <li>
                                        <Link className="dropdown-item" href="/buat-pengaduan">
                                            <i className="fas fa-plus-circle me-2 text-primary"></i>Buat Pengaduan
                                        </Link>
                                    </li>
                                    <li>
                                        <Link className="dropdown-item" href="/buat-pengaduan">
                                            <i className="fas fa-chalkboard-teacher me-2 text-primary"></i>Laporan Dosen
                                        </Link>
                                    </li>
                                    <li><hr className="dropdown-divider" /></li>
                                    <li>
                                        <Link className="dropdown-item" href="/dashboard">
                                            <i className="fas fa-history me-2 text-primary"></i>Riwayat Laporan
                                        </Link>
                                    </li>
                                </ul>
                            </li>
                            
                            {/* Aspirasi */}
                            <li className="nav-item">
                                <Link className="nav-link" href="/riwayat-aspirasi">
                                    <i className="fas fa-lightbulb me-1"></i>Aspirasi
                                </Link>
                            </li>
                            
                            {/* FAQ */}
                            <li className="nav-item">
                                <Link className="nav-link" href="/faq">
                                    <i className="fas fa-question-circle me-1"></i>FAQ
                                </Link>
                            </li>
                            
                            {/* Admin Panel */}
                            {user.role === 'admin' && (
                                <li className="nav-item">
                                    <Link className="nav-link text-warning" href="/dashboard">
                                        <i className="fas fa-shield-alt me-1"></i>Admin Panel
                                    </Link>
                                </li>
                            )}
                            
                            {/* Notifikasi */}
                            <li className="nav-item dropdown">
                                <a className="nav-link dropdown-toggle position-relative" href="#" id="notifDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                                    <i className="fas fa-bell"></i>
                                    <span id="notifBadge" className="notif-badge" style={{ display: 'none' }}>0</span>
                                </a>
                                <ul className="dropdown-menu dropdown-menu-end" id="notifList" aria-labelledby="notifDropdown" style={{ minWidth: '300px' }}>
                                    <li><h6 className="dropdown-header">Notifikasi</h6></li>
                                    <li><span className="dropdown-item text-muted small">Belum ada notifikasi</span></li>
                                </ul>
                            </li>
                            
                            {/* Logout */}
                            <li className="nav-item">
                                <a className="nav-link btn btn-outline-light btn-sm ms-2 rounded-pill px-3" href="/api/auth/logout">
                                    <i className="fas fa-sign-out-alt me-1"></i>Logout
                                </a>
                            </li>
                        </>
                    ) : (
                        <>
                            {/* USER BELUM LOGIN (TAMU) */}
                            {pathname !== '/login' && pathname !== '/register' && (
                                <>
                                    <li className="nav-item">
                                        <Link className="nav-link" href="/">Beranda</Link>
                                    </li>
                                    <li className="nav-item">
                                        <Link className="nav-link" href="/faq">FAQ</Link>
                                    </li>
                                </>
                            )}
                            
                            {pathname !== '/login' && (
                                <li className="nav-item">
                                    <Link className="nav-link" href="/login">
                                        <i className="fas fa-sign-in-alt me-1"></i>Login
                                    </Link>
                                </li>
                            )}
                            
                            {pathname !== '/register' && (
                                <li className="nav-item">
                                    <Link className="nav-link btn btn-light btn-sm ms-2 rounded-pill px-3" href="/register">
                                        <i className="fas fa-user-plus me-1"></i>Daftar
                                    </Link>
                                </li>
                            )}
                        </>
                    )}
                </ul>
            </div>
        </div>
    </nav>
  );
}

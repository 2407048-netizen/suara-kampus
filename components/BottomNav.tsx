'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav({ user }: { user: any }) {
  const pathname = usePathname();

  if (!user) return null;

  const getLinkClass = (path: string) => {
    return pathname === path ? 'bottom-nav-item active' : 'bottom-nav-item';
  };

  const dashboardLink = user.role === 'admin' || user.role === 'staff' ? '/admin/dashboard' : '/dashboard';

  return (
    <div className="bottom-nav">
      <Link href="/" className={getLinkClass('/')}>
        <i className="fas fa-home"></i>
        <span>Home</span>
      </Link>
      <Link href={dashboardLink} className={getLinkClass(dashboardLink)}>
        <i className="fas fa-columns"></i>
        <span>Dashboard</span>
      </Link>
      <Link href="/aspirasi" className={getLinkClass('/aspirasi')}>
        <i className="fas fa-lightbulb"></i>
        <span>Aspirasi</span>
      </Link>
      <a href="/api/auth/logout" className="bottom-nav-item text-danger">
        <i className="fas fa-sign-out-alt"></i>
        <span>Logout</span>
      </a>
    </div>
  );
}

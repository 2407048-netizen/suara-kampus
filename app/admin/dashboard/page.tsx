export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import db from '@/lib/db';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function AdminDashboard() {
  const token = cookies().get('token')?.value;
  if (!token) redirect('/login');
  const session = await verifyJWT(token);
  if (!session || (session.role !== 'admin' && session.role !== 'staff')) {
    redirect('/dashboard');
  }

  // Fetch data
  const reports = await db.prepare(`
    SELECT * FROM reports 
    WHERE kategori != 'Aspirasi & Saran' AND is_deleted = 0
    ORDER BY created_at DESC
  `).all() as any[];

  const total_laporan = reports.length;
  const pending_laporan = reports.filter(r => r.status !== 'Selesai').length;
  const selesai_laporan = reports.filter(r => r.status === 'Selesai').length;
  const total_user = ((await db.prepare(`SELECT COUNT(*) as count FROM users WHERE is_deleted = 0`).get()) as any).count;
  const total_aspirasi = ((await db.prepare(`SELECT COUNT(*) as count FROM aspirations WHERE is_deleted = 0`).get()) as any).count;
  
  const recent_activity = reports.slice(0, 5);

  return (
    <>
        <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h2 className="fw-bold mb-1">Admin Dashboard</h2>
                <p className="text-muted mb-0">Ringkasan laporan, status, dan aktivitas terbaru.</p>
            </div>
            <Link href="/keluhan" className="btn btn-itg">Lihat Semua Laporan</Link>
        </div>

        <div className="row g-4 mb-4">
            <div className="col-md-3">
                <div className="card p-3 shadow-sm border-0 h-100 rounded-4">
                    <div className="text-muted small"><i className="fas fa-file-alt me-2 text-primary"></i>Total Laporan</div>
                    <h3 className="fw-bold mt-2">{total_laporan}</h3>
                </div>
            </div>
            <div className="col-md-3">
                <div className="card p-3 shadow-sm border-0 h-100 rounded-4">
                    <div className="text-muted small"><i className="fas fa-clock me-2 text-warning"></i>Pending</div>
                    <h3 className="fw-bold mt-2">{pending_laporan}</h3>
                </div>
            </div>
            <div className="col-md-3">
                <div className="card p-3 shadow-sm border-0 h-100 rounded-4">
                    <div className="text-muted small"><i className="fas fa-check-circle me-2 text-success"></i>Selesai</div>
                    <h3 className="fw-bold mt-2">{selesai_laporan}</h3>
                </div>
            </div>
            <div className="col-md-3">
                <div className="card p-3 shadow-sm border-0 h-100 rounded-4">
                    <div className="text-muted small"><i className="fas fa-users me-2 text-info"></i>Total User</div>
                    <h3 className="fw-bold mt-2">{total_user}</h3>
                </div>
            </div>
        </div>

        <div className="row g-4">
            <div className="col-lg-8">
                <div className="card p-4 shadow-sm border-0 h-100 rounded-4">
                    <h5 className="fw-bold mb-3">Recent Activity</h5>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Judul</th>
                                    <th>Status</th>
                                    <th>Waktu</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recent_activity.length > 0 ? (
                                    recent_activity.map((item: any) => (
                                        <tr key={item.id}>
                                            <td>#{item.id}</td>
                                            <td>{item.judul}</td>
                                            <td>
                                                <span className={`badge ${item.status === 'Selesai' ? 'bg-success' : item.status === 'Diproses' ? 'bg-primary' : 'bg-secondary'}`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td>{new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td>
                                                <Link href={`/admin/reports/${item.id}`} className="btn btn-sm btn-outline-primary">Detail</Link>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={5} className="text-muted text-center">Belum ada laporan.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="col-lg-4">
                <div className="card p-4 shadow-sm border-0 h-100 rounded-4">
                    <h5 className="fw-bold mb-3">Ringkasan</h5>
                    <ul className="list-group list-group-flush">
                        <li className="list-group-item d-flex justify-content-between px-0">
                            <span>Total Aspirasi</span>
                            <strong>{total_aspirasi}</strong>
                        </li>
                        <li className="list-group-item d-flex justify-content-between px-0">
                            <span>Status Selesai</span>
                            <strong>{selesai_laporan}</strong>
                        </li>
                        <li className="list-group-item d-flex justify-content-between px-0">
                            <span>Status Pending</span>
                            <strong>{pending_laporan}</strong>
                        </li>
                    </ul>
                    <div className="mt-3 d-grid gap-2">
                        <Link href="/admin/laporan-dosen" className="btn btn-outline-primary btn-sm">
                            <i className="fas fa-chalkboard-teacher me-2"></i>Laporan Dosen
                        </Link>
                        <Link href="/riwayat-aspirasi" className="btn btn-outline-warning btn-sm">
                            <i className="fas fa-lightbulb me-2"></i>Riwayat Aspirasi
                        </Link>
                        <a href="/api/admin/export-csv" className="btn btn-outline-success btn-sm">
                            <i className="fas fa-file-csv me-2"></i>Export CSV
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </>
  );
}

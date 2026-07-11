import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default async function AdminDashboard() {
  const token = cookies().get('token')?.value;
  if (!token) redirect('/login');
  const session = await verifyJWT(token);
  if (!session || (session.role !== 'admin' && session.role !== 'staff')) {
    redirect('/dashboard');
  }

  const reports = db.prepare(`SELECT * FROM reports WHERE kategori != 'Aspirasi & Saran'`).all() as any[];
  const users = db.prepare(`SELECT count(*) as count FROM users`).get() as any;
  const aspirasiCount = db.prepare(`SELECT count(*) as count FROM aspirations`).get() as any;

  const total_laporan = reports.length;
  const pending_laporan = reports.filter(r => r.status === 'Menunggu Persetujuan' || r.status === 'Open').length;
  const selesai_laporan = reports.filter(r => r.status === 'Selesai').length;
  const total_user = users.count;
  const total_aspirasi = aspirasiCount.count;

  const recent_activity = [...reports].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  return (
    <>
      <Navbar user={session} />
      <div className="container py-3" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <div className="d-flex justify-content-between align-items-center mb-4 mt-4">
          <div>
            <h2 className="fw-bold mb-1">Admin Dashboard</h2>
            <p className="text-muted mb-0">Ringkasan laporan, status, dan aktivitas terbaru.</p>
          </div>
          <Link href="/dashboard" className="btn btn-itg">Lihat Semua Laporan</Link>
        </div>

        <div className="row g-4 mb-4">
          <div className="col-md-3">
            <div className="card p-3 shadow-sm border-0">
              <div className="text-muted small fw-semibold">Total Laporan</div>
              <h3 className="fw-bold mt-2 text-primary">{total_laporan}</h3>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card p-3 shadow-sm border-0">
              <div className="text-muted small fw-semibold">Pending</div>
              <h3 className="fw-bold mt-2 text-warning">{pending_laporan}</h3>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card p-3 shadow-sm border-0">
              <div className="text-muted small fw-semibold">Selesai</div>
              <h3 className="fw-bold mt-2 text-success">{selesai_laporan}</h3>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card p-3 shadow-sm border-0">
              <div className="text-muted small fw-semibold">Total User</div>
              <h3 className="fw-bold mt-2 text-info">{total_user}</h3>
            </div>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-lg-8">
            <div className="card p-4 shadow-sm border-0">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">Recent Activity</h5>
                <a href="/api/admin/export-csv" className="btn btn-sm btn-outline-success">
                  <i className="fas fa-file-excel me-1"></i>Export CSV
                </a>
              </div>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>ID</th>
                      <th>Judul</th>
                      <th>Status</th>
                      <th>Waktu</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent_activity.map((item: any) => (
                      <tr key={item.id}>
                        <td><small className="text-muted">#{item.id}</small></td>
                        <td><strong>{item.judul}</strong></td>
                        <td><span className="badge bg-info text-dark">{item.status}</span></td>
                        <td><small>{new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</small></td>
                        <td><Link href={`/admin/reports/${item.id}`} className="btn btn-sm btn-outline-primary">Detail</Link></td>
                      </tr>
                    ))}
                    {recent_activity.length === 0 && (
                      <tr><td colSpan={5} className="text-muted text-center py-4">Belum ada aktivitas.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card p-4 shadow-sm border-0">
              <h5 className="fw-bold mb-3">Ringkasan</h5>
              <ul className="list-group list-group-flush">
                <li className="list-group-item d-flex justify-content-between px-0">
                  <span className="text-muted">Total Aspirasi</span>
                  <strong className="text-dark">{total_aspirasi}</strong>
                </li>
                <li className="list-group-item d-flex justify-content-between px-0">
                  <span className="text-muted">Status Selesai</span>
                  <strong className="text-success">{selesai_laporan}</strong>
                </li>
                <li className="list-group-item d-flex justify-content-between px-0">
                  <span className="text-muted">Status Pending</span>
                  <strong className="text-warning">{pending_laporan}</strong>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import db from '@/lib/db';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BottomNav from '@/components/BottomNav';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const token = cookies().get('token')?.value;
  if (!token) redirect('/login');
  const session = await verifyJWT(token);
  if (!session) redirect('/login');

  let tickets = [];
  if (session.role === 'admin' || session.role === 'staff') {
    tickets = db.prepare(`
      SELECT * FROM reports 
      WHERE kategori != 'Aspirasi & Saran' 
      ORDER BY created_at DESC
    `).all();
  } else {
    tickets = db.prepare(`
      SELECT * FROM reports 
      WHERE user_id = ? AND kategori != 'Aspirasi & Saran' 
      ORDER BY created_at DESC
    `).all(session.user_id);
  }

  return (
    <>
      <Navbar user={session} />
      <div className="container" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <div className="d-flex justify-content-between align-items-center mb-4 mt-4">
          <div>
            <h4 className="fw-bold mb-0"><i className="fas fa-folder-open text-primary me-2"></i>Daftar Keluhan</h4>
            <p className="text-muted small mb-0">Pantau status keluhan fasilitas kampus Anda</p>
          </div>
          {session.role === 'mahasiswa' && (
            <Link href="/buat-pengaduan" className="btn btn-primary px-4">
              <i className="fas fa-plus me-1"></i>Buat Laporan
            </Link>
          )}
        </div>

        <div className="card">
          <div className="card-body p-0">
            <div className="alert alert-info border-0 rounded-0 mb-0 px-4 py-3 small">
              <i className="fas fa-info-circle me-2"></i>
              <strong>Info:</strong> PDF laporan hanya dapat diunduh setelah status laporan menjadi <strong>"Selesai"</strong>.
              Notifikasi email akan dikirim otomatis ketika laporan selesai ditangani.
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Judul</th>
                    <th>Kategori</th>
                    <th>Prioritas</th>
                    <th>Status</th>
                    <th>Tanggal</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t: any) => (
                    <tr key={t.id}>
                      <td><span className="fw-semibold text-muted">#{t.id}</span></td>
                      <td>
                        <strong className="small">{t.judul}</strong><br />
                        <small className="text-muted">Pelapor: Mahasiswa Anonim</small>
                      </td>
                      <td><small>{t.kategori}</small></td>
                      <td>
                        {t.prioritas === 'Urgent' ? <span className="badge bg-danger">Urgent</span> :
                         t.prioritas === 'Tinggi' ? <span className="badge bg-warning text-dark">Tinggi</span> :
                         <span className="badge bg-info text-dark">{t.prioritas}</span>}
                      </td>
                      <td>
                        {t.status === 'Menunggu Persetujuan' ? <span className="badge bg-secondary">Menunggu</span> :
                         t.status === 'Open' ? <span className="badge bg-warning text-dark">Open</span> :
                         t.status === 'Diproses' ? <span className="badge bg-primary">Diproses</span> :
                         t.status === 'Selesai' ? <span className="badge bg-success">Selesai</span> :
                         <span className="badge bg-dark">Ditutup</span>}
                      </td>
                      <td><small>{new Date(t.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</small></td>
                      <td>
                        {(t.status === 'Selesai' || ['admin', 'staff'].includes(session.role)) ? (
                          <a href={`/api/pdf/${t.id}`} className="btn btn-sm btn-danger me-1" title="Download PDF" target="_blank">
                            <i className="fas fa-file-pdf"></i> PDF
                          </a>
                        ) : (
                          <span className="badge bg-light text-muted border"><i className="fas fa-lock me-1"></i>Terkunci</span>
                        )}

                        {['admin', 'staff'].includes(session.role) && (
                          <form method="POST" action={`/api/laporan/${t.id}/status`} className="d-inline-block mt-1">
                            <select name="status" className="form-select form-select-sm" style={{ minWidth: '140px' }} defaultValue={t.status} onChange={(e) => e.target.form?.submit()}>
                              <option>Menunggu Persetujuan</option>
                              <option>Open</option>
                              <option>Diproses</option>
                              <option>Selesai</option>
                              <option>Ditutup</option>
                            </select>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {tickets.length === 0 && (
                <div className="text-center py-5 text-muted">
                  <i className="fas fa-inbox fa-3x mb-3 d-block opacity-25"></i>
                  <p className="mb-3">Belum ada keluhan yang dilaporkan.</p>
                  {session.role === 'mahasiswa' && (
                    <Link href="/buat-pengaduan" className="btn btn-primary rounded-pill px-4">
                      <i className="fas fa-plus me-1"></i>Buat Laporan Pertama
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <BottomNav user={session} />
      <Footer />
    </>
  );
}

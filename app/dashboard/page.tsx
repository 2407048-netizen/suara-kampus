export const dynamic = 'force-dynamic';

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

  // If Admin, redirect to admin dashboard
  if (session.role === 'admin' || session.role === 'staff') {
    redirect('/admin/dashboard');
  }

  // --- GET TICKETS ---
  const tickets = await db.prepare(`
    SELECT * FROM reports 
    WHERE user_id = ? AND kategori != 'Aspirasi & Saran' 
    ORDER BY created_at DESC
  `).all(session.user_id) as any[];

  // --- GET STATISTICS ---
  const total_laporan = tickets.length;
  const laporan_diproses = tickets.filter(t => t.status === 'Diproses').length;
  const laporan_selesai = tickets.filter(t => t.status === 'Selesai').length;

  // --- GET ASPIRASI STATS ---
  const aspirasiAll = await db.prepare(`SELECT * FROM aspirasi`).all() as any[];
  const total_aspirasi = aspirasiAll.length;
  const total_like = aspirasiAll.reduce((sum, a) => sum + (a.support_count || 0), 0);
  
  // Aspirasi Terpopuler
  let aspirasi_populer = null;
  if (aspirasiAll.length > 0) {
    aspirasi_populer = [...aspirasiAll].sort((a, b) => (b.support_count || 0) - (a.support_count || 0))[0];
  }

  // --- GET NOTIFIKASI ---
  // We can mock this or use activity_logs or notifications table if exists. 
  // Let's check reports that were recently updated
  const notifikasi = await db.prepare(`
    SELECT judul, status, updated_at 
    FROM reports 
    WHERE user_id = ? 
    ORDER BY updated_at DESC LIMIT 5
  `).all(session.user_id) as any[];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .stat-card {
            border: none;
            border-radius: 15px;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            background: #fff;
        }
        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important;
        }
        .icon-box {
            width: 60px;
            height: 60px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        }
        .bg-light-primary { background-color: rgba(13, 110, 253, 0.1); color: #0d6efd; }
        .bg-light-warning { background-color: rgba(255, 193, 7, 0.1); color: #ffc107; }
        .bg-light-success { background-color: rgba(25, 135, 84, 0.1); color: #198754; }
        .bg-light-info { background-color: rgba(13, 202, 240, 0.1); color: #0dcaf0; }
        .bg-light-danger { background-color: rgba(220, 53, 69, 0.1); color: #dc3545; }
        
        .timeline {
            position: relative;
            padding-left: 30px;
            list-style: none;
        }
        .timeline::before {
            content: '';
            position: absolute;
            left: 10px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: #e9ecef;
        }
        .timeline-item {
            position: relative;
            margin-bottom: 20px;
        }
        .timeline-item::before {
            content: '';
            position: absolute;
            left: -26px;
            top: 4px;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #0d6efd;
            border: 3px solid #fff;
            box-shadow: 0 0 0 2px #0d6efd;
        }
      `}} />

      <div className="row mb-4 align-items-center">
          <div className="col-md-8">
              <h2 className="fw-bold" style={{ color: '#003366' }}>Halo, {session.nama}! 👋</h2>
              <p className="text-muted">Selamat datang di Dashboard Suara Kampus ITG. Berikut ringkasan aktivitas Anda.</p>
          </div>
          <div className="col-md-4 text-md-end mt-3 mt-md-0">
              <Link href="/buat-pengaduan" className="btn btn-itg px-4 py-2 rounded-pill shadow-sm">
                  <i className="fas fa-plus me-2"></i>Buat Laporan
              </Link>
          </div>
      </div>

      {/* STATISTIK GRID */}
      <div className="row g-4 mb-5">
          <div className="col-md-4 col-sm-6">
              <div className="card stat-card shadow-sm h-100 p-3">
                  <div className="d-flex align-items-center">
                      <div className="icon-box bg-light-primary me-3">
                          <i className="fas fa-file-alt"></i>
                      </div>
                      <div>
                          <h6 className="text-muted mb-1">Total Keluhan</h6>
                          <h3 className="fw-bold mb-0">{total_laporan}</h3>
                      </div>
                  </div>
              </div>
          </div>
          
          <div className="col-md-4 col-sm-6">
              <div className="card stat-card shadow-sm h-100 p-3">
                  <div className="d-flex align-items-center">
                      <div className="icon-box bg-light-warning me-3">
                          <i className="fas fa-spinner"></i>
                      </div>
                      <div>
                          <h6 className="text-muted mb-1">Sedang Diproses</h6>
                          <h3 className="fw-bold mb-0">{laporan_diproses}</h3>
                      </div>
                  </div>
              </div>
          </div>

          <div className="col-md-4 col-sm-6">
              <div className="card stat-card shadow-sm h-100 p-3">
                  <div className="d-flex align-items-center">
                      <div className="icon-box bg-light-success me-3">
                          <i className="fas fa-check-circle"></i>
                      </div>
                      <div>
                          <h6 className="text-muted mb-1">Laporan Selesai</h6>
                          <h3 className="fw-bold mb-0">{laporan_selesai}</h3>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <div className="row g-4 mb-5">
          {/* STATISTIK ASPIRASI */}
          <div className="col-lg-8">
              <div className="card shadow-sm border-0 rounded-4 h-100">
                  <div className="card-header bg-white border-0 pt-4 pb-0 px-4">
                      <h5 className="fw-bold text-dark"><i className="fas fa-bullhorn text-warning me-2"></i>Sekilas Aspirasi Kampus</h5>
                  </div>
                  <div className="card-body p-4">
                      <div className="row text-center mb-4">
                          <div className="col-6 border-end">
                              <h2 className="fw-bold text-primary mb-0">{total_aspirasi}</h2>
                              <span className="text-muted">Total Aspirasi</span>
                          </div>
                          <div className="col-6">
                              <h2 className="fw-bold text-danger mb-0"><i className="fas fa-heart me-1"></i>{total_like}</h2>
                              <span className="text-muted">Total Dukungan</span>
                          </div>
                      </div>
                      
                      {aspirasi_populer ? (
                        <div className="p-3 bg-light rounded-3 border-start border-4 border-warning">
                            <span className="badge bg-warning text-dark mb-2">Aspirasi Terpopuler</span>
                            <h6 className="fw-bold mb-1">{aspirasi_populer.judul}</h6>
                            <p className="text-muted small mb-2 text-truncate">{aspirasi_populer.deskripsi}</p>
                            <span className="badge bg-danger rounded-pill"><i className="fas fa-heart me-1"></i>{aspirasi_populer.support_count || 0} Dukungan</span>
                        </div>
                      ) : (
                        <div className="text-center text-muted p-3">
                            <p className="mb-0">Belum ada aspirasi yang tercatat.</p>
                        </div>
                      )}
                  </div>
              </div>
          </div>

          {/* NOTIFIKASI TERBARU */}
          <div className="col-lg-4">
              <div className="card shadow-sm border-0 rounded-4 h-100">
                  <div className="card-header bg-white border-0 pt-4 pb-0 px-4">
                      <h5 className="fw-bold text-dark"><i className="fas fa-bell text-info me-2"></i>Notifikasi Terbaru</h5>
                  </div>
                  <div className="card-body p-4">
                      {notifikasi.length > 0 ? (
                        <ul className="timeline m-0">
                            {notifikasi.map((n: any, idx: number) => (
                                <li className="timeline-item" key={idx}>
                                    <h6 className="fw-bold mb-1">{n.judul}</h6>
                                    <p className="text-muted small mb-1">
                                        Status berubah menjadi: 
                                        <span className={`ms-1 badge ${n.status === 'Selesai' ? 'bg-success' : n.status === 'Diproses' ? 'bg-primary' : 'bg-secondary'}`}>
                                            {n.status}
                                        </span>
                                    </p>
                                    <small className="text-muted"><i className="far fa-clock me-1"></i>{new Date(n.updated_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</small>
                                </li>
                            ))}
                        </ul>
                      ) : (
                        <div className="text-center text-muted mt-4">
                            <i className="far fa-bell-slash fa-2x mb-2"></i>
                            <p>Belum ada notifikasi.</p>
                        </div>
                      )}
                  </div>
              </div>
          </div>
      </div>

      {/* TABEL KELUHAN LAMA DIINTEGRASIKAN */}
      <div className="row">
          <div className="col-12">
              <div className="card shadow-sm border-0 rounded-4 p-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                      <h4 className="fw-bold text-primary mb-0"><i className="fas fa-list me-2"></i>Daftar Keluhan</h4>
                  </div>

                  <div className="alert alert-info border-0 rounded-3">
                      <i className="fas fa-info-circle me-2"></i>
                      <strong>Info:</strong> PDF laporan hanya dapat diunduh setelah status laporan menjadi <strong>"Selesai"</strong>. 
                  </div>

                  <div className="table-responsive mt-3">
                      <table className="table table-hover align-middle">
                          <thead className="table-light">
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
                                      <td><span className="fw-bold text-muted">#{t.id}</span></td>
                                      <td>
                                          <strong>{t.judul}</strong><br />
                                          <small className="text-muted">Pelapor: {session.nama}</small>
                                      </td>
                                      <td>{t.kategori}</td>
                                      <td>
                                          {t.prioritas === 'Urgent' ? <span className="badge bg-danger">Urgent</span> :
                                           t.prioritas === 'Tinggi' ? <span className="badge bg-warning text-dark">Tinggi</span> :
                                           <span className="badge bg-info text-dark">{t.prioritas}</span>}
                                      </td>
                                      <td>
                                          {t.status === 'Diajukan' ? <span className="badge bg-secondary">Diajukan</span> :
                                           t.status === 'Menunggu Persetujuan' ? <span className="badge bg-secondary">Menunggu Persetujuan</span> :
                                           t.status === 'Open' ? <span className="badge bg-warning text-dark">Open</span> :
                                           t.status === 'Diproses' ? <span className="badge bg-primary">Diproses</span> :
                                           t.status === 'Selesai' ? <span className="badge bg-success">Selesai</span> :
                                           <span className="badge bg-dark">Ditutup</span>}
                                      </td>
                                      <td>{new Date(t.created_at).toLocaleDateString('id-ID')}</td>
                                      <td>
                                          {t.status === 'Selesai' ? (
                                              <a href={`/api/pdf/${t.id}`} className="btn btn-sm btn-danger mb-1 shadow-sm" title="Download Laporan PDF" target="_blank">
                                                  <i className="fas fa-file-pdf"></i> PDF
                                              </a>
                                          ) : (
                                              <span className="badge bg-light text-muted border"><i className="fas fa-lock me-1"></i>Terkunci</span>
                                          )}
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                      {tickets.length === 0 && (
                          <div className="text-center py-5 text-muted">
                              <i className="fas fa-inbox fa-4x mb-3 text-light"></i>
                              <h5>Belum ada keluhan yang dilaporkan.</h5>
                              <Link href="/buat-pengaduan" className="btn btn-primary mt-2 rounded-pill px-4">
                                  <i className="fas fa-plus me-1"></i> Buat Laporan Pertama
                              </Link>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </div>
    </>
  );
}

export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import db from '@/lib/db';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function KeluhanPage() {
  const token = cookies().get('token')?.value;
  if (!token) redirect('/login');
  const session = await verifyJWT(token);
  if (!session) redirect('/login');

  let tickets: any[] = [];
  if (session.role === 'admin' || session.role === 'staff') {
    tickets = await db.prepare(`
      SELECT * FROM reports 
      WHERE kategori != 'Aspirasi & Saran' AND is_deleted = 0
      ORDER BY created_at DESC
    `).all();
  } else {
    tickets = await db.prepare(`
      SELECT * FROM reports 
      WHERE user_id = ? AND kategori != 'Aspirasi & Saran' AND is_deleted = 0
      ORDER BY created_at DESC
    `).all(session.user_id);
  }

  return (
    <div className="row mb-4">
        <div className="col-12">
            <div className="card p-4 border-0 shadow-sm rounded-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                        <h2 className="h4 text-primary"><i className="fas fa-folder-open me-2"></i>Daftar Keluhan</h2>
                        <p className="text-muted mb-0">Pantau status keluhan fasilitas kampus Anda</p>
                    </div>
                    {session.role === 'mahasiswa' && (
                        <Link href="/buat-pengaduan" className="btn btn-itg">
                            <i className="fas fa-plus me-1"></i> Buat Laporan Baru
                        </Link>
                    )}
                </div>

                <div className="alert alert-info border-0 rounded-3">
                    <i className="fas fa-info-circle me-2"></i>
                    <strong>Info:</strong> PDF laporan hanya dapat diunduh setelah status laporan menjadi <strong>&quot;Selesai&quot;</strong>. 
                    Notifikasi email akan dikirim otomatis ketika laporan selesai ditangani.
                </div>

                <div className="table-responsive">
                    <table className="table table-hover table-bordered align-middle">
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
                            {tickets.length > 0 ? tickets.map((t: any) => (
                            <tr key={t.id}>
                                <td><span className="fw-semibold text-muted">#{t.id}</span></td>
                                <td>
                                    <strong>{t.judul}</strong><br />
                                    <small className="text-muted">Pelapor: Mahasiswa Anonim</small>
                                </td>
                                <td>{t.kategori}</td>
                                <td>
                                    {t.prioritas === 'Urgent' ? <span className="badge bg-danger">Urgent</span>
                                     : t.prioritas === 'Tinggi' ? <span className="badge bg-warning text-dark">Tinggi</span>
                                     : <span className="badge bg-info text-dark">{t.prioritas}</span>}
                                </td>
                                <td>
                                    {t.status === 'Menunggu Persetujuan' ? <span className="badge bg-secondary">Menunggu Persetujuan</span>
                                     : t.status === 'Open' ? <span className="badge bg-warning text-dark">Open</span>
                                     : t.status === 'Diproses' ? <span className="badge bg-primary">Diproses</span>
                                     : t.status === 'Selesai' ? <span className="badge bg-success">Selesai</span>
                                     : <span className="badge bg-dark">Ditutup</span>}
                                </td>
                                <td>{new Date(t.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                                <td>
                                    <div className="d-flex flex-column gap-1">
                                        <Link href={`/chat/${t.id}`} className="btn btn-sm btn-outline-secondary">
                                            <i className="fas fa-comments me-1"></i>Chat
                                        </Link>
                                        {(t.status === 'Selesai' || ['admin', 'staff'].includes(session.role)) ? (
                                            <a href={`/api/pdf/${t.id}`} className="btn btn-sm btn-danger" title="Download PDF">
                                                <i className="fas fa-file-pdf me-1"></i>PDF
                                            </a>
                                        ) : (
                                            <span className="badge bg-light text-dark"><i className="fas fa-lock me-1"></i>Belum Tersedia</span>
                                        )}
                                        {['admin', 'staff'].includes(session.role) && (
                                            <Link href={`/admin/reports/${t.id}`} className="btn btn-sm btn-outline-primary">
                                                Detail
                                            </Link>
                                        )}
                                    </div>
                                </td>
                            </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7}>
                                        <div className="text-center py-4 text-muted">
                                            <i className="fas fa-inbox fa-3x mb-2"></i>
                                            <p>Tidak ada keluhan ditemukan.</p>
                                            {session.role === 'mahasiswa' && (
                                                <Link href="/buat-pengaduan" className="btn btn-itg">
                                                    <i className="fas fa-plus me-1"></i> Buat Laporan Pertama
                                                </Link>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
  );
}

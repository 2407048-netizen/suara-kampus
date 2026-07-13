export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import db from '@/lib/db';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function RiwayatAspirasi() {
  const token = cookies().get('token')?.value;
  if (!token) redirect('/login');
  const session = await verifyJWT(token);
  if (!session) redirect('/login');

  // Fetch aspirasi from aspirations table
  const tickets = await db.prepare(`
    SELECT a.*, u.nama as user_nama 
    FROM aspirations a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.is_deleted = 0
    ORDER BY a.created_at DESC
  `).all() as any[];

  return (
    <div className="row mb-4">
        <div className="col-12">
            <div className="card p-4 shadow-sm border-0 rounded-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                        <h2 className="h4 text-warning fw-bold"><i className="fas fa-lightbulb me-2"></i>Aspirasi Mahasiswa</h2>
                        <p className="text-muted mb-0">Dukung aspirasi yang bermanfaat untuk kemajuan kampus</p>
                    </div>
                    <Link href="/aspirasi" className="btn btn-warning text-white rounded-pill px-4">
                        <i className="fas fa-plus me-1"></i> Kirim Aspirasi
                    </Link>
                </div>

                <div className="alert alert-info border-0 rounded-3">
                    <i className="fas fa-info-circle me-2"></i>
                    <strong>Aspirasi Publik:</strong> Semua aspirasi ditampilkan secara anonim. 
                    Aspirasi dengan dukungan terbanyak akan diprioritaskan oleh admin.
                </div>

                <div className="table-responsive mt-3">
                    <table className="table table-hover table-bordered align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>ID</th>
                                <th>Judul Aspirasi</th>
                                <th>Isi Aspirasi</th>
                                <th className="text-center">Dukungan</th>
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
                                        <small className="text-muted">Oleh: {t.is_anonymous ? 'Mahasiswa Anonim' : (t.user_nama || 'Mahasiswa')}</small>
                                    </td>
                                    <td>{t.isi ? (t.isi.length > 100 ? t.isi.substring(0, 100) + '...' : t.isi) : ''}</td>
                                    <td className="text-center">
                                        <span className="badge bg-warning text-dark fs-6">
                                            <i className="fas fa-thumbs-up me-1"></i>{t.like_count || 0}
                                        </span>
                                    </td>
                                    <td>{new Date(t.created_at).toLocaleDateString('id-ID')}</td>
                                    <td>
                                        <a href={`/api/aspirasi/${t.id}/vote-redirect`} className="btn btn-sm btn-outline-primary mb-1 d-block" title="Dukung aspirasi ini">
                                            <i className="fas fa-plus me-1"></i>Dukung
                                        </a>

                                        {/* Admin Actions */}
                                        {['admin', 'staff'].includes(session.role) && (
                                            <form method="POST" action={`/api/aspirasi/${t.id}/admin-status`} className="mt-2">
                                                <select name="status" className="form-select form-select-sm" defaultValue="Diajukan" title="Ubah Status">
                                                    <option value="Diajukan">Diterima</option>
                                                    <option value="Dipertimbangkan">Dipertimbangkan</option>
                                                    <option value="Diterapkan">Diterapkan</option>
                                                    <option value="Ditolak">Ditolak</option>
                                                </select>
                                                <button type="submit" className="btn btn-sm btn-secondary w-100 mt-1">Simpan</button>
                                            </form>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6}>
                                        <div className="text-center py-4 text-muted">
                                            <i className="fas fa-inbox fa-3x mb-2"></i>
                                            <p>Belum ada aspirasi yang dikirim.</p>
                                            <Link href="/aspirasi" className="btn btn-warning text-white rounded-pill">
                                                <i className="fas fa-plus me-1"></i> Kirim Aspirasi Pertama
                                            </Link>
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

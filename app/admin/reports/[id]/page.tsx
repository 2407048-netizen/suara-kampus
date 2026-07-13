export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import db from '@/lib/db';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

export default async function AdminReportDetail({ params }: { params: { id: string } }) {
  const token = cookies().get('token')?.value;
  if (!token) redirect('/login');
  const session = await verifyJWT(token);
  if (!session || !['admin', 'staff'].includes(session.role)) {
    redirect('/dashboard');
  }

  const ticket = await db.prepare(`
    SELECT r.*, u.nama as user_nama, u.nim, u.email as user_email
    FROM reports r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE r.id = ? AND r.is_deleted = 0
  `).get(params.id) as any;

  if (!ticket) return notFound();

  return (
    <div className="py-3">
        <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h2 className="fw-bold mb-1">Detail Laporan #{ticket.id}</h2>
                <p className="text-muted mb-0">Kelola status, tanggapan, dan bukti penyelesaian.</p>
            </div>
            <Link href="/keluhan" className="btn btn-outline-secondary">Kembali</Link>
        </div>

        <div className="row g-4">
            <div className="col-lg-8">
                <div className="card p-4 mb-4 border-0 shadow-sm rounded-4">
                    <h5 className="fw-bold mb-3">Informasi Laporan</h5>
                    <dl className="row">
                        <dt className="col-sm-4">Judul</dt>
                        <dd className="col-sm-8">{ticket.judul}</dd>
                        <dt className="col-sm-4">Pelapor</dt>
                        <dd className="col-sm-8">{ticket.user_nama || '-'} {ticket.nim ? `(${ticket.nim})` : ''}</dd>
                        <dt className="col-sm-4">Email</dt>
                        <dd className="col-sm-8">{ticket.user_email || '-'}</dd>
                        <dt className="col-sm-4">Kategori</dt>
                        <dd className="col-sm-8">{ticket.kategori}</dd>
                        <dt className="col-sm-4">Lokasi</dt>
                        <dd className="col-sm-8">{ticket.lokasi || '-'}</dd>
                        <dt className="col-sm-4">Prioritas</dt>
                        <dd className="col-sm-8">{ticket.prioritas}</dd>
                        <dt className="col-sm-4">Status</dt>
                        <dd className="col-sm-8"><span className="badge bg-info text-dark">{ticket.status}</span></dd>
                        <dt className="col-sm-4">Deskripsi</dt>
                        <dd className="col-sm-8">{ticket.deskripsi}</dd>
                        <dt className="col-sm-4">Dibuat</dt>
                        <dd className="col-sm-8">{new Date(ticket.created_at).toLocaleString('id-ID')}</dd>
                    </dl>
                    {ticket.foto && (
                        <div className="mt-3">
                            <strong>Foto Bukti:</strong><br />
                            <img src={ticket.foto} alt="Foto Bukti" className="img-thumbnail mt-2" style={{ maxHeight: '250px' }} />
                        </div>
                    )}
                </div>

                <div className="card p-4 border-0 shadow-sm rounded-4">
                    <h5 className="fw-bold mb-3"><i className="fas fa-comments me-2"></i>Chat dengan Pelapor</h5>
                    <Link href={`/chat/${ticket.id}`} className="btn btn-primary">
                        <i className="fas fa-comments me-2"></i>Buka Chat
                    </Link>
                </div>
            </div>

            <div className="col-lg-4">
                <div className="card p-4 border-0 shadow-sm rounded-4">
                    <h5 className="fw-bold mb-3">Perbarui Status</h5>
                    <form method="post" action={`/api/laporan/${ticket.id}/status`} encType="multipart/form-data">
                        <div className="mb-3">
                            <label className="form-label">Status</label>
                            <select name="status" className="form-select" defaultValue={ticket.status}>
                                <option value="Menunggu Persetujuan">Menunggu Persetujuan</option>
                                <option value="Open">Open</option>
                                <option value="Diproses">Diproses</option>
                                <option value="Selesai">Selesai</option>
                                <option value="Ditutup">Ditutup</option>
                            </select>
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Tanggapan Admin</label>
                            <textarea name="admin_response" className="form-control" rows={4} placeholder="Tulis tanggapan admin..." defaultValue={ticket.admin_response || ticket.tanggapan_admin || ''}></textarea>
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Bukti Penyelesaian</label>
                            <input type="file" name="proof_file" className="form-control" accept="image/*,.pdf" />
                        </div>
                        <button className="btn btn-itg w-100" type="submit">Simpan Perubahan</button>
                    </form>
                </div>
            </div>
        </div>

        {ticket.admin_response && (
        <div className="card p-4 mt-4 border-0 shadow-sm rounded-4">
            <h5 className="fw-bold mb-2">Tanggapan Admin</h5>
            <p className="mb-0">{ticket.admin_response}</p>
        </div>
        )}

        {ticket.proof_file && (
        <div className="card p-4 mt-4 border-0 shadow-sm rounded-4">
            <h5 className="fw-bold mb-2">Bukti Penyelesaian</h5>
            <a href={ticket.proof_file} target="_blank" rel="noreferrer" className="btn btn-outline-primary">Lihat File</a>
        </div>
        )}
    </div>
  );
}

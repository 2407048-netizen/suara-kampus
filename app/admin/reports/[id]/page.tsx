import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default async function AdminReportDetail({ params }: { params: { id: string } }) {
  const token = cookies().get('token')?.value;
  if (!token) redirect('/login');
  const session = await verifyJWT(token);
  if (!session || (session.role !== 'admin' && session.role !== 'staff')) {
    redirect('/dashboard');
  }

  const getReport = db.prepare('SELECT r.*, u.nama as user_nama FROM reports r LEFT JOIN users u ON r.user_id = u.id WHERE r.id = ?');
  const ticket = getReport.get(params.id) as any;

  if (!ticket) {
    return (
      <>
        <Navbar user={session} />
        <div className="container mt-5 text-center">
          <h3>Laporan tidak ditemukan</h3>
          <Link href="/admin/dashboard" className="btn btn-primary mt-3">Kembali</Link>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar user={session} />
      <div className="container py-3 mt-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-1">Detail Laporan #{ticket.id}</h2>
            <p className="text-muted mb-0">Kelola status, tanggapan, dan bukti penyelesaian.</p>
          </div>
          <Link href="/admin/dashboard" className="btn btn-outline-secondary">Kembali</Link>
        </div>

        <div className="row g-4">
          <div className="col-lg-8">
            <div className="card p-4 shadow-sm border-0 mb-4">
              <h5 className="fw-bold mb-3 border-bottom pb-2">Informasi Laporan</h5>
              <dl className="row mb-0">
                <dt className="col-sm-4 text-muted">Judul</dt>
                <dd className="col-sm-8 fw-semibold">{ticket.judul}</dd>
                <dt className="col-sm-4 text-muted">Pelapor</dt>
                <dd className="col-sm-8">{ticket.user_nama || '-'}</dd>
                <dt className="col-sm-4 text-muted">Kategori</dt>
                <dd className="col-sm-8">{ticket.kategori}</dd>
                <dt className="col-sm-4 text-muted">Lokasi</dt>
                <dd className="col-sm-8">{ticket.lokasi || '-'}</dd>
                <dt className="col-sm-4 text-muted">Prioritas</dt>
                <dd className="col-sm-8">{ticket.prioritas}</dd>
                <dt className="col-sm-4 text-muted">Status</dt>
                <dd className="col-sm-8">
                  <span className={`badge ${ticket.status === 'Selesai' ? 'bg-success' : 'bg-info text-dark'}`}>
                    {ticket.status}
                  </span>
                </dd>
                <dt className="col-sm-4 text-muted mt-2">Deskripsi</dt>
                <dd className="col-sm-8 mt-2 p-3 bg-light rounded">{ticket.deskripsi}</dd>
              </dl>
            </div>

            {ticket.admin_response && (
              <div className="card p-4 shadow-sm border-0 mt-4">
                <h5 className="fw-bold mb-2">Tanggapan Admin</h5>
                <p className="mb-0 text-muted">{ticket.admin_response}</p>
              </div>
            )}

            {ticket.proof_file && (
              <div className="card p-4 shadow-sm border-0 mt-4">
                <h5 className="fw-bold mb-2">Bukti Penyelesaian</h5>
                <a href={ticket.proof_file} target="_blank" className="btn btn-outline-primary d-inline-block" style={{ width: 'fit-content' }}>
                  <i className="fas fa-external-link-alt me-2"></i>Lihat File
                </a>
              </div>
            )}
          </div>

          <div className="col-lg-4">
            <div className="card p-4 shadow-sm border-0">
              <h5 className="fw-bold mb-3">Perbarui Status</h5>
              <form method="post" action={`/api/admin/reports/${ticket.id}`} encType="multipart/form-data">
                <div className="mb-3">
                  <label className="form-label fw-semibold">Status</label>
                  <select name="status" className="form-select" defaultValue={ticket.status}>
                    <option value="Menunggu Persetujuan">Menunggu Persetujuan</option>
                    <option value="Open">Open</option>
                    <option value="Diproses">Diproses</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Ditutup">Ditutup</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Tanggapan Admin</label>
                  <textarea name="admin_response" className="form-control" rows={4} placeholder="Tulis tanggapan admin..." defaultValue={ticket.admin_response || ''}></textarea>
                </div>
                <div className="mb-4">
                  <label className="form-label fw-semibold">Upload Bukti Penyelesaian (Opsional)</label>
                  <input type="file" name="proof_file" className="form-control" />
                </div>
                <button className="btn btn-itg w-100" type="submit">
                  <i className="fas fa-save me-2"></i>Simpan Perubahan
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

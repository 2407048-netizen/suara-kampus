import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default async function AdminLaporanDosen() {
  const token = cookies().get('token')?.value;
  if (!token) redirect('/login');
  const session = await verifyJWT(token);
  if (!session || (session.role !== 'admin' && session.role !== 'staff')) {
    redirect('/dashboard');
  }

  const reports = db.prepare(`SELECT * FROM lecturer_reports ORDER BY created_at DESC`).all() as any[];

  return (
    <>
      <Navbar user={session} />
      <div className="container py-3 mt-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-1"><i className="fas fa-user-secret text-danger me-2"></i>Laporan Kinerja Dosen</h2>
            <p className="text-muted mb-0">Manajemen laporan rahasia terkait kinerja dosen.</p>
          </div>
          <Link href="/admin/dashboard" className="btn btn-outline-secondary">Kembali</Link>
        </div>

        <div className="alert alert-danger border-danger shadow-sm rounded-4 mb-4 d-flex" role="alert">
          <div className="me-3 fs-3 text-danger">
            <i className="fas fa-shield-alt"></i>
          </div>
          <div>
            <h5 className="alert-heading fw-bold mb-1">Sangat Rahasia (Confidential)</h5>
            <p className="mb-0 small">Identitas pelapor harus dirahasiakan dan tidak boleh disebarluaskan di luar tim akademik yang berwenang.</p>
          </div>
        </div>

        <div className="card shadow-sm border-0 rounded-4">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Nama Dosen</th>
                    <th>Mata Kuliah (Kelas)</th>
                    <th>Judul Laporan</th>
                    <th>Status</th>
                    <th>Tanggal</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((item: any) => (
                    <tr key={item.id} className={item.is_archived ? 'table-secondary opacity-75' : ''}>
                      <td><small className="text-muted">#D{item.id}</small></td>
                      <td><strong>{item.nama_dosen}</strong></td>
                      <td>
                        {item.mata_kuliah} <br/>
                        <span className="badge bg-light text-dark border">{item.kelas || '-'}</span>
                      </td>
                      <td>
                        <div className="text-truncate" style={{ maxWidth: '200px' }} title={item.judul}>{item.judul}</div>
                      </td>
                      <td>
                        <span className={`badge ${item.status === 'Selesai' ? 'bg-success' : item.status === 'Ditolak' ? 'bg-danger' : 'bg-warning text-dark'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td><small>{new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</small></td>
                      <td>
                        <button type="button" className="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target={`#modalDetail${item.id}`}>
                          <i className="fas fa-search me-1"></i>Detail
                        </button>

                        <div className="modal fade" id={`modalDetail${item.id}`} tabIndex={-1} aria-hidden="true">
                          <div className="modal-dialog modal-lg modal-dialog-centered">
                            <div className="modal-content border-0 shadow">
                              <div className="modal-header bg-danger text-white">
                                <h5 className="modal-title"><i className="fas fa-lock me-2"></i>Detail Laporan Dosen #D{item.id}</h5>
                                <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                              </div>
                              <div className="modal-body p-4">
                                <div className="row g-3">
                                  <div className="col-md-6">
                                    <div className="p-3 bg-light rounded h-100">
                                      <small className="text-muted d-block mb-1">Nama Dosen</small>
                                      <strong>{item.nama_dosen}</strong>
                                    </div>
                                  </div>
                                  <div className="col-md-3">
                                    <div className="p-3 bg-light rounded h-100">
                                      <small className="text-muted d-block mb-1">Mata Kuliah</small>
                                      <strong>{item.mata_kuliah}</strong>
                                    </div>
                                  </div>
                                  <div className="col-md-3">
                                    <div className="p-3 bg-light rounded h-100">
                                      <small className="text-muted d-block mb-1">Kelas/Semester</small>
                                      <strong>{item.kelas} / {item.semester}</strong>
                                    </div>
                                  </div>
                                  
                                  <div className="col-12 mt-4">
                                    <h6 className="fw-bold border-bottom pb-2">Judul Laporan</h6>
                                    <p>{item.judul}</p>
                                  </div>
                                  
                                  <div className="col-12">
                                    <h6 className="fw-bold border-bottom pb-2">Kronologi Kejadian</h6>
                                    <p className="bg-light p-3 rounded" style={{ whiteSpace: 'pre-wrap' }}>{item.kronologi}</p>
                                  </div>
                                  
                                  <div className="col-12">
                                    <h6 className="fw-bold border-bottom pb-2">Dampak Terhadap Pembelajaran</h6>
                                    <p className="bg-light p-3 rounded" style={{ whiteSpace: 'pre-wrap' }}>{item.dampak}</p>
                                  </div>

                                  {item.bukti_path && (
                                    <div className="col-12">
                                      <h6 className="fw-bold border-bottom pb-2">Bukti Pendukung</h6>
                                      <img src={item.bukti_path} className="img-fluid rounded" alt="Bukti" style={{ maxHeight: '300px' }} />
                                    </div>
                                  )}
                                </div>
                                
                                <hr className="my-4" />
                                
                                <form method="POST" action={`/api/admin/laporan-dosen/${item.id}`}>
                                  <div className="row g-3 align-items-end">
                                    <div className="col-md-4">
                                      <label className="form-label fw-bold">Update Status</label>
                                      <select name="status" className="form-select" defaultValue={item.status}>
                                        <option value="Diajukan">Diajukan</option>
                                        <option value="Ditinjau">Ditinjau</option>
                                        <option value="Diproses">Diproses</option>
                                        <option value="Selesai">Selesai</option>
                                        <option value="Ditolak">Ditolak</option>
                                      </select>
                                    </div>
                                    <div className="col-md-5">
                                      <label className="form-label fw-bold">Tanggapan Admin (Opsional)</label>
                                      <input type="text" name="tanggapan_admin" className="form-control" defaultValue={item.tanggapan_admin || ''} placeholder="Catatan internal..." />
                                    </div>
                                    <div className="col-md-3">
                                      <div className="form-check mb-2">
                                        <input className="form-check-input" type="checkbox" name="is_archived" id={`archive${item.id}`} defaultChecked={!!item.is_archived} />
                                        <label className="form-check-label small" htmlFor={`archive${item.id}`}>Arsipkan</label>
                                      </div>
                                      <button type="submit" className="btn btn-primary w-100">Simpan</button>
                                    </div>
                                  </div>
                                </form>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {reports.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-5 text-muted">Belum ada laporan dosen.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

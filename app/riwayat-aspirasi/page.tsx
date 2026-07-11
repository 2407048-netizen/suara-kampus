import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BottomNav from '@/components/BottomNav';

export default async function RiwayatAspirasi() {
  const token = cookies().get('token')?.value;
  if (!token) redirect('/login');
  const session = await verifyJWT(token);
  if (!session) redirect('/login');

  const my_aspirations = db.prepare(`
    SELECT * FROM aspirations 
    WHERE user_id = ? 
    ORDER BY created_at DESC
  `).all(session.user_id);

  return (
    <>
      <Navbar user={session} />
      <div className="container" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <div className="row g-4 mt-3 mb-5">
          <div className="col-12">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-header bg-white border-0 pt-4 pb-2 px-4 d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="h4 fw-bold text-dark mb-1"><i className="fas fa-history text-primary me-2"></i>Riwayat Aspirasi Saya</h2>
                  <p className="text-muted small mb-0">Daftar seluruh aspirasi yang pernah Anda kirimkan.</p>
                </div>
                <Link href="/aspirasi" className="btn btn-outline-secondary btn-sm">
                  <i className="fas fa-arrow-left me-1"></i>Kembali
                </Link>
              </div>
              <div className="card-body p-4">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '15%' }}>Tanggal</th>
                        <th style={{ width: '25%' }}>Judul</th>
                        <th style={{ width: '40%' }}>Isi Aspirasi</th>
                        <th style={{ width: '10%' }} className="text-center"><i className="fas fa-thumbs-up text-success"></i></th>
                        <th style={{ width: '10%' }} className="text-center"><i className="fas fa-thumbs-down text-danger"></i></th>
                      </tr>
                    </thead>
                    <tbody>
                      {my_aspirations.map((item: any) => (
                        <tr key={item.id}>
                          <td><small className="text-muted">{new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</small></td>
                          <td><strong>{item.judul}</strong></td>
                          <td>
                            <p className="mb-0 text-truncate" style={{ maxWidth: '300px' }} title={item.isi}>
                              {item.isi}
                            </p>
                          </td>
                          <td className="text-center fw-bold text-success">{item.like_count}</td>
                          <td className="text-center fw-bold text-danger">{item.dislike_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {my_aspirations.length === 0 && (
                    <div className="text-center py-5 text-muted">
                      <i className="fas fa-inbox fa-3x mb-3 d-block opacity-25"></i>
                      <p>Anda belum pernah membuat aspirasi.</p>
                      <Link href="/aspirasi" className="btn btn-primary rounded-pill px-4 mt-2">
                        <i className="fas fa-plus me-1"></i>Buat Aspirasi Pertama
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <BottomNav user={session} />
      <Footer />
    </>
  );
}

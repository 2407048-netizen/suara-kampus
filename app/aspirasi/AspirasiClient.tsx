'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BottomNav from '@/components/BottomNav';
import Swal from 'sweetalert2';

export default function AspirasiClient({ user, aspirasiList, q, sort }: { user: any, aspirasiList: any[], q: string, sort: string }) {
  const router = useRouter();
  const [judul, setJudul] = useState('');
  const [isi, setIsi] = useState('');
  const [isAnonim, setIsAnonim] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData();
    formData.append('judul', judul);
    formData.append('isi', isi);
    formData.append('is_anonim', isAnonim ? 'true' : 'false');

    try {
      const res = await fetch('/api/aspirasi', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'Berhasil', text: data.message });
        setJudul('');
        setIsi('');
        setIsAnonim(false);
        router.refresh();
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal', text: data.message });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Terjadi kesalahan pada server.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (aspirasiId: string, voteType: 'like' | 'dislike') => {
    try {
      const res = await fetch(`/api/aspirasi/${aspirasiId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote_type: voteType })
      });
      
      const data = await res.json();
      if (res.ok) {
        router.refresh();
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal', text: data.message });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="row g-4 mt-3 mb-5">
          <div className="col-12">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4">
                <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
                  <div>
                    <h2 className="h4 fw-bold text-dark mb-1"><i className="fas fa-lightbulb text-warning me-2"></i>Aspirasi Publik</h2>
                    <p className="text-muted mb-0">Sampaikan ide, kritik, dan saran untuk kemajuan kampus secara terbuka.</p>
                  </div>
                  <Link href="/riwayat-aspirasi" className="btn btn-outline-secondary btn-sm">
                    <i className="fas fa-history me-1"></i>Riwayat Aspirasi
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4">
                <form method="get" action="/aspirasi" className="row g-3 align-items-end">
                  <div className="col-lg-6">
                    <label className="form-label fw-semibold">Cari aspirasi</label>
                    <div className="input-group">
                      <span className="input-group-text bg-white"><i className="fas fa-search text-muted"></i></span>
                      <input type="text" name="q" className="form-control" placeholder="Cari judul atau isi aspirasi" defaultValue={q} />
                    </div>
                  </div>
                  <div className="col-lg-3">
                    <label className="form-label fw-semibold">Urutkan</label>
                    <select name="sort" className="form-select" defaultValue={sort}>
                      <option value="terbaru">Terbaru</option>
                      <option value="terpopuler">Terpopuler</option>
                    </select>
                  </div>
                  <div className="col-lg-3">
                    <button type="submit" className="btn btn-itg w-100">
                      <i className="fas fa-filter me-1"></i>Terapkan
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="col-12">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4">
                <h3 className="h5 fw-bold mb-3"><i className="fas fa-plus-circle text-primary me-2"></i>Buat Aspirasi Baru</h3>
                <form onSubmit={handleSubmit}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Judul Aspirasi</label>
                      <input type="text" className="form-control" placeholder="Contoh: Perbaiki akses Wi-Fi di perpustakaan" value={judul} onChange={e => setJudul(e.target.value)} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Kirim sebagai anonim</label>
                      <div className="form-check mt-2">
                        <input className="form-check-input" type="checkbox" id="is_anonim" checked={isAnonim} onChange={e => setIsAnonim(e.target.checked)} />
                        <label className="form-check-label" htmlFor="is_anonim">Ya, kirim sebagai anonim</label>
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Isi Aspirasi</label>
                      <textarea className="form-control" rows={4} placeholder="Tuliskan usulan atau saran Anda..." value={isi} onChange={e => setIsi(e.target.value)} required></textarea>
                    </div>
                    <div className="col-12 text-end">
                      <button type="submit" className="btn btn-itg" disabled={isLoading}>
                        {isLoading ? (
                          <><span className="spinner-border spinner-border-sm me-2"></span>Loading...</>
                        ) : (
                          <><i className="fas fa-paper-plane me-1"></i>Kirim Aspirasi</>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="col-12">
            {aspirasiList && aspirasiList.length > 0 ? (
              <div className="row g-4">
                {aspirasiList.map((item: any) => (
                  <div className="col-12" key={item.id}>
                    <div className="card border-0 shadow-sm rounded-4 h-100">
                      <div className="card-body p-4">
                        <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                          <div>
                            <span className="badge bg-primary-subtle text-primary mb-2">Aspirasi Publik</span>
                            <h3 className="h5 fw-bold mb-1">{item.judul}</h3>
                          </div>
                          <small className="text-muted">{new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</small>
                        </div>
                        <p className="text-muted mb-4">{item.isi}</p>
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                          <div className="text-muted small">
                            <i className="fas fa-user me-1"></i>
                            {item.is_anonymous ? 'Mahasiswa Anonim' : item.user_nama}
                          </div>
                          <div className="vote-actions d-flex gap-2">
                            <button type="button" className="btn btn-outline-success btn-sm" onClick={() => handleVote(item.id, 'like')}>
                              <i className="fas fa-thumbs-up me-1"></i>
                              <span>{item.like_count}</span>
                            </button>
                            <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => handleVote(item.id, 'dislike')}>
                              <i className="fas fa-thumbs-down me-1"></i>
                              <span>{item.dislike_count}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="alert alert-info rounded-4 border-0">
                <i className="fas fa-info-circle me-2"></i>Belum ada aspirasi yang sesuai dengan pencarian saat ini.
              </div>
            )}
          </div>
        </div>
  );
}

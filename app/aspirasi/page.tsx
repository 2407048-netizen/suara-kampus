'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';

function AspirasiContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const sortParam = searchParams.get('sort') || 'terbaru';

  const [aspirasiList, setAspirasiList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    judul: '',
    isi: '',
    is_anonim: false
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAspirasi();
  }, [queryParam, sortParam]);

  const fetchAspirasi = async () => {
    try {
      const res = await fetch(`/api/aspirasi?q=${encodeURIComponent(queryParam)}&sort=${sortParam}`);
      const data = await res.json();
      if (res.ok) {
        setAspirasiList(data.aspirasi);
      }
    } catch (error) {
      console.error('Error fetching aspirasi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const q = formData.get('q') as string;
    const sort = formData.get('sort') as string;
    router.push(`/aspirasi?q=${encodeURIComponent(q)}&sort=${sort}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/aspirasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        Swal.fire({
          toast: true, position: 'top-end', icon: 'success',
          title: 'Aspirasi berhasil dikirim!', showConfirmButton: false, timer: 3000
        });
        setFormData({ judul: '', isi: '', is_anonim: false });
        fetchAspirasi();
      } else {
        const err = await res.json();
        Swal.fire({
          toast: true, position: 'top-end', icon: 'error',
          title: err.message || 'Gagal mengirim', showConfirmButton: false, timer: 3000
        });
      }
    } catch (error) {
      Swal.fire({
        toast: true, position: 'top-end', icon: 'error',
        title: 'Kesalahan jaringan', showConfirmButton: false, timer: 3000
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (aspirasiId: number, type: 'like' | 'dislike') => {
    try {
      const res = await fetch(`/api/aspirasi/${aspirasiId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote_type: type })
      });
      const data = await res.json();
      if (data.success) {
        // Update local state
        setAspirasiList(prev => prev.map(a => {
          if (a.id === aspirasiId) {
            return {
              ...a,
              support_count: data.like_count, // Use support_count to match DB schema if needed
              like_count: data.like_count,
              dislike_count: data.dislike_count,
            };
          }
          return a;
        }));
      } else {
        alert(data.message || 'Gagal memproses vote.');
      }
    } catch (error) {
      alert('Terjadi kesalahan saat mengirim vote.');
    }
  };

  return (
    <div className="row g-4">
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
                    <form onSubmit={handleSearch} className="row g-3 align-items-end">
                        <div className="col-lg-6">
                            <label className="form-label fw-semibold">Cari aspirasi</label>
                            <div className="input-group">
                                <span className="input-group-text bg-white"><i className="fas fa-search text-muted"></i></span>
                                <input type="text" name="q" className="form-control" placeholder="Cari judul atau isi aspirasi" defaultValue={queryParam} />
                            </div>
                        </div>
                        <div className="col-lg-3">
                            <label className="form-label fw-semibold">Urutkan</label>
                            <select name="sort" className="form-select" defaultValue={sortParam}>
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
                                <input type="text" name="judul" className="form-control" placeholder="Contoh: Perbaiki akses Wi-Fi di perpustakaan" required 
                                    value={formData.judul} onChange={e => setFormData({...formData, judul: e.target.value})} />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-semibold">Kirim sebagai anonim</label>
                                <div className="form-check mt-2">
                                    <input className="form-check-input" type="checkbox" name="is_anonim" id="is_anonim" 
                                        checked={formData.is_anonim} onChange={e => setFormData({...formData, is_anonim: e.target.checked})} />
                                    <label className="form-check-label" htmlFor="is_anonim">Ya, kirim sebagai anonim</label>
                                </div>
                            </div>
                            <div className="col-12">
                                <label className="form-label fw-semibold">Isi Aspirasi</label>
                                <textarea name="isi" className="form-control" rows={4} placeholder="Tuliskan usulan atau saran Anda..." required
                                    value={formData.isi} onChange={e => setFormData({...formData, isi: e.target.value})}></textarea>
                            </div>
                            <div className="col-12 text-end">
                                <button type="submit" className="btn btn-itg" disabled={submitting}>
                                    <i className="fas fa-paper-plane me-1"></i>{submitting ? 'Mengirim...' : 'Kirim Aspirasi'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <div className="col-12">
            {loading ? (
                <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
            ) : aspirasiList.length > 0 ? (
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
                                        {item.is_anonim ? 'Mahasiswa Anonim' : (item.user_nama || 'Mahasiswa')}
                                    </div>
                                    <div className="vote-actions d-flex gap-2">
                                        <button type="button" className="btn btn-outline-success btn-sm vote-btn" onClick={() => handleVote(item.id, 'like')}>
                                            <i className="fas fa-thumbs-up me-1"></i>
                                            <span className="like-count">{item.like_count || item.support_count || 0}</span>
                                        </button>
                                        <button type="button" className="btn btn-outline-danger btn-sm vote-btn" onClick={() => handleVote(item.id, 'dislike')}>
                                            <i className="fas fa-thumbs-down me-1"></i>
                                            <span className="dislike-count">{item.dislike_count || 0}</span>
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

export default function AspirasiPage() {
  return (
    <Suspense fallback={<div className="text-center py-5"><div className="spinner-border text-primary"></div></div>}>
      <AspirasiContent />
    </Suspense>
  );
}

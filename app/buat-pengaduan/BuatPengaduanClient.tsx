'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BottomNav from '@/components/BottomNav';
import Swal from 'sweetalert2';

export default function BuatPengaduanClient({ user }: { user?: any }) {
  const router = useRouter();
  const [judul, setJudul] = useState('');
  const [kategori, setKategori] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5242880) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Ukuran file terlalu besar! Maksimal 5MB.' });
        e.target.value = '';
        setPreview(null);
        return;
      }
      setFoto(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData();
    formData.append('judul', judul);
    formData.append('kategori', kategori);
    formData.append('deskripsi', deskripsi);
    if (foto) {
      formData.append('foto', foto);
    }

    try {
      const res = await fetch('/api/laporan', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'Berhasil', text: data.message });
        router.push('/dashboard');
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

  return (
    <div className="row justify-content-center mb-5 mt-4">
      <div className="col-lg-8">
            <div className="card shadow-sm border-0 rounded-4">
              <div className="card-header bg-white border-0 pt-4 pb-2 px-4 d-flex align-items-center">
                <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '45px', height: '45px' }}>
                  <i className="fas fa-edit fs-5"></i>
                </div>
                <div>
                  <h4 className="fw-bold text-dark mb-0">Buat Laporan Pengaduan</h4>
                  <p className="text-muted small mb-0">Sampaikan keluhan Anda terkait fasilitas atau layanan kampus.</p>
                </div>
              </div>
              
              <div className="card-body p-4">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Judul Laporan <span className="text-danger">*</span></label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Contoh: AC Kelas F12 Mati" 
                      value={judul}
                      onChange={(e) => setJudul(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Kategori <span className="text-danger">*</span></label>
                    <select 
                      className="form-select" 
                      value={kategori}
                      onChange={(e) => setKategori(e.target.value)}
                      required
                    >
                      <option value="" disabled>-- Pilih Kategori --</option>
                      <option value="Fasilitas Kelas">Fasilitas Kelas</option>
                      <option value="Fasilitas Lab">Fasilitas Lab</option>
                      <option value="Fasilitas Kampus">Fasilitas Kampus (Umum)</option>
                      <option value="Himpunan Mahasiswa">Himpunan Mahasiswa</option>
                      <option value="Layanan TUK">Layanan TUK</option>
                      <option value="Layanan PRODI">Layanan PRODI</option>
                      <option value="Layanan Kampus">Layanan Kampus (Lainnya)</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-semibold">Deskripsi Detail <span className="text-danger">*</span></label>
                    <textarea 
                      className="form-control" 
                      rows={5} 
                      placeholder="Ceritakan keluhan Anda secara detail agar mudah dipahami..." 
                      value={deskripsi}
                      onChange={(e) => setDeskripsi(e.target.value)}
                      required
                    ></textarea>
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-semibold">Upload Bukti Foto (Opsional)</label>
                    <input 
                      className="form-control" 
                      type="file" 
                      accept=".jpg, .jpeg, .png" 
                      onChange={handleFileChange} 
                    />
                    <div className="form-text">Format didukung: JPG, PNG. Maksimal 5MB.</div>
                    
                    {preview && (
                      <div className="preview-container d-block mt-3 p-2 text-center" style={{ border: '2px dashed #ddd', borderRadius: '10px', background: '#f8f9fa' }}>
                        <span className="text-muted small d-block mb-2">Preview Gambar:</span>
                        <img src={preview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '5px' }} />
                      </div>
                    )}
                  </div>

                  <hr className="my-4" />

                  <div className="d-flex justify-content-between">
                    <Link href="/dashboard" className="btn btn-light border px-4">Batal</Link>
                    <button type="submit" className="btn btn-primary px-4 fw-semibold" disabled={isLoading}>
                      {isLoading ? (
                        <><span className="spinner-border spinner-border-sm me-2"></span>Loading...</>
                      ) : (
                        <><i className="fas fa-paper-plane me-2"></i>Kirim Laporan</>
                      )}
                    </button>
                  </div>
                </form>
              </div>
        </div>
      </div>
    </div>
  );
}

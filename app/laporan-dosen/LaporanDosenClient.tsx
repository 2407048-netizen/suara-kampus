'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BottomNav from '@/components/BottomNav';
import Swal from 'sweetalert2';

export default function LaporanDosenClient({ user }: { user?: any }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nama_dosen: '',
    mata_kuliah: '',
    kelas: '',
    semester: '',
    judul: '',
    kronologi: '',
    dampak: ''
  });
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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
    
    const submitData = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      submitData.append(key, value);
    });
    if (foto) {
      submitData.append('bukti', foto);
    }

    try {
      const res = await fetch('/api/laporan-dosen', {
        method: 'POST',
        body: submitData,
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
    <>
      <Navbar user={user} />
      <div className="container" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <div className="row justify-content-center mb-5 mt-4">
          <div className="col-lg-8">
            <div className="alert alert-warning border-warning shadow-sm rounded-4 mb-4 d-flex" role="alert">
              <div className="me-3 fs-3 text-warning">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <div>
                <h5 className="alert-heading fw-bold mb-1">Warning Etika Pelaporan</h5>
                <p className="mb-0 small text-dark">Laporan ini bersifat rahasia dan akan langsung ditangani oleh pihak akademik. Harap isi dengan <strong>jujur, objektif, dan berdasar bukti</strong>. Segala bentuk fitnah atau pencemaran nama baik yang terbukti tidak benar dapat dikenakan sanksi akademik.</p>
              </div>
            </div>

            <div className="card shadow-sm border-0 rounded-4">
              <div className="card-header bg-white border-0 pt-4 pb-2 px-4 d-flex align-items-center">
                <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '45px', height: '45px' }}>
                  <i className="fas fa-chalkboard-teacher fs-5"></i>
                </div>
                <div>
                  <h4 className="fw-bold text-dark mb-0">Laporan Kinerja Dosen</h4>
                  <p className="text-muted small mb-0">Kerahasiaan identitas Anda terjamin.</p>
                </div>
              </div>
              
              <div className="card-body p-4">
                <form onSubmit={handleSubmit}>
                  <div className="row g-3 mb-3">
                    <div className="col-md-12">
                      <label className="form-label fw-semibold">Nama Dosen <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" name="nama_dosen" placeholder="Tuliskan nama lengkap beserta gelar (jika tahu)" value={formData.nama_dosen} onChange={handleChange} required />
                    </div>
                    
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Mata Kuliah <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" name="mata_kuliah" value={formData.mata_kuliah} onChange={handleChange} required />
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Kelas <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" name="kelas" placeholder="Contoh: IF A" value={formData.kelas} onChange={handleChange} required />
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Semester <span className="text-danger">*</span></label>
                      <select className="form-select" name="semester" value={formData.semester} onChange={handleChange} required>
                        <option value="" disabled>Pilih...</option>
                        <option value="Ganjil">Ganjil</option>
                        <option value="Genap">Genap</option>
                        <option value="Pendek">Pendek</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Judul Laporan / Ringkasan Singkat <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" name="judul" placeholder="Contoh: Dosen jarang masuk kelas tanpa keterangan" value={formData.judul} onChange={handleChange} required />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Kronologi Kejadian <span className="text-danger">*</span></label>
                    <textarea className="form-control" name="kronologi" rows={4} placeholder="Ceritakan urutan kejadian secara objektif..." value={formData.kronologi} onChange={handleChange} required></textarea>
                  </div>
                  
                  <div className="mb-4">
                    <label className="form-label fw-semibold">Dampak Terhadap Pembelajaran <span className="text-danger">*</span></label>
                    <textarea className="form-control" name="dampak" rows={3} placeholder="Bagaimana hal ini mempengaruhi proses belajar Anda/kelas?" value={formData.dampak} onChange={handleChange} required></textarea>
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-semibold">Upload Bukti Pendukung (Opsional)</label>
                    <input className="form-control" type="file" accept=".jpg, .jpeg, .png" onChange={handleFileChange} />
                    <div className="form-text">Format: JPG, PNG (Maks 5MB). Screenshot chat atau bukti tertulis.</div>
                    
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
                        <><i className="fas fa-lock me-2"></i>Kirim Laporan Rahasia</>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      <BottomNav user={user} />
      <Footer />
    </>
  );
}

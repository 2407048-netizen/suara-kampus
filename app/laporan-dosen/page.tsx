'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';

export default function LaporanDosen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nama_dosen: '',
    mata_kuliah: '',
    kelas: '',
    semester: '',
    judul: '',
    kronologi: '',
    dampak_pembelajaran: ''
  });
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5242880) {
        alert('Ukuran file terlalu besar! Maksimal 5MB.');
        e.target.value = '';
        setPreview(null);
        setFoto(null);
        return;
      }
      setFoto(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
      setFoto(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => data.append(key, value));
      if (foto) data.append('foto', foto);

      const res = await fetch('/api/laporan-dosen', {
        method: 'POST',
        body: data
      });

      const result = await res.json();
      if (res.ok) {
        Swal.fire({
          toast: true, position: 'top-end', icon: 'success',
          title: 'Laporan berhasil dikirim!', showConfirmButton: false, timer: 3000
        });
        router.push('/dashboard');
      } else {
        Swal.fire({
          toast: true, position: 'top-end', icon: 'error',
          title: result.error || 'Gagal mengirim laporan', showConfirmButton: false, timer: 3000
        });
      }
    } catch (error) {
      Swal.fire({
        toast: true, position: 'top-end', icon: 'error',
        title: 'Terjadi kesalahan jaringan', showConfirmButton: false, timer: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
        <style dangerouslySetInnerHTML={{__html: `
            .form-control:focus, .form-select:focus {
                border-color: #0d6efd;
                box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
            }
            .preview-container {
                margin-top: 15px;
                border: 2px dashed #ddd;
                border-radius: 10px;
                padding: 10px;
                text-align: center;
                background: #f8f9fa;
            }
            .preview-container img {
                max-width: 100%;
                max-height: 250px;
                border-radius: 5px;
            }
        `}} />
        
        <div className="row justify-content-center mb-5">
            <div className="col-lg-8">
                
                {/* WARNING ETIKA */}
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
                                    <label htmlFor="nama_dosen" className="form-label fw-semibold">Nama Dosen <span className="text-danger">*</span></label>
                                    <input type="text" className="form-control" id="nama_dosen" name="nama_dosen" required placeholder="Tuliskan nama lengkap beserta gelar (jika tahu)"
                                        value={formData.nama_dosen} onChange={e => setFormData({...formData, nama_dosen: e.target.value})} />
                                </div>
                                
                                <div className="col-md-6">
                                    <label htmlFor="mata_kuliah" className="form-label fw-semibold">Mata Kuliah <span className="text-danger">*</span></label>
                                    <input type="text" className="form-control" id="mata_kuliah" name="mata_kuliah" required 
                                        value={formData.mata_kuliah} onChange={e => setFormData({...formData, mata_kuliah: e.target.value})} />
                                </div>
                                
                                <div className="col-md-3">
                                    <label htmlFor="kelas" className="form-label fw-semibold">Kelas <span className="text-danger">*</span></label>
                                    <input type="text" className="form-control" id="kelas" name="kelas" required placeholder="Contoh: IF A"
                                        value={formData.kelas} onChange={e => setFormData({...formData, kelas: e.target.value})} />
                                </div>
                                
                                <div className="col-md-3">
                                    <label htmlFor="semester" className="form-label fw-semibold">Semester <span className="text-danger">*</span></label>
                                    <select className="form-select" id="semester" name="semester" required
                                        value={formData.semester} onChange={e => setFormData({...formData, semester: e.target.value})}>
                                        <option value="" disabled>Pilih...</option>
                                        <option value="Ganjil">Ganjil</option>
                                        <option value="Genap">Genap</option>
                                        <option value="Pendek">Pendek</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mb-3">
                                <label htmlFor="judul" className="form-label fw-semibold">Judul Laporan / Ringkasan Singkat <span className="text-danger">*</span></label>
                                <input type="text" className="form-control" id="judul" name="judul" required placeholder="Contoh: Dosen jarang masuk kelas tanpa keterangan"
                                    value={formData.judul} onChange={e => setFormData({...formData, judul: e.target.value})} />
                            </div>

                            <div className="mb-3">
                                <label htmlFor="kronologi" className="form-label fw-semibold">Kronologi Kejadian <span className="text-danger">*</span></label>
                                <textarea className="form-control" id="kronologi" name="kronologi" rows={4} required placeholder="Ceritakan urutan kejadian secara objektif..."
                                    value={formData.kronologi} onChange={e => setFormData({...formData, kronologi: e.target.value})}></textarea>
                            </div>
                            
                            <div className="mb-4">
                                <label htmlFor="dampak_pembelajaran" className="form-label fw-semibold">Dampak Terhadap Pembelajaran <span className="text-danger">*</span></label>
                                <textarea className="form-control" id="dampak_pembelajaran" name="dampak_pembelajaran" rows={3} required placeholder="Bagaimana hal ini mempengaruhi proses belajar Anda/kelas?"
                                    value={formData.dampak_pembelajaran} onChange={e => setFormData({...formData, dampak_pembelajaran: e.target.value})}></textarea>
                            </div>

                            <div className="mb-4">
                                <label htmlFor="foto" className="form-label fw-semibold">Upload Bukti Pendukung (Opsional)</label>
                                <input className="form-control" type="file" id="foto" name="foto" accept=".jpg, .jpeg, .png" onChange={handleFileChange} />
                                <div className="form-text">Format: JPG, PNG (Maks 5MB). Screenshot chat atau bukti tertulis.</div>
                                
                                {/* Image Preview */}
                                <div className="preview-container" id="previewContainer" style={{ display: preview ? 'block' : 'none' }}>
                                    <span className="text-muted small d-block mb-2">Preview Gambar:</span>
                                    {preview && <img id="imagePreview" src={preview} alt="Preview" />}
                                </div>
                            </div>

                            <hr className="my-4" />

                            <div className="d-flex justify-content-between">
                                <Link href="/dashboard" className="btn btn-light border px-4">Batal</Link>
                                <button type="submit" className="btn btn-primary px-4 fw-semibold" disabled={loading}>
                                    <i className="fas fa-lock me-2"></i>{loading ? 'Mengirim...' : 'Kirim Laporan Rahasia'}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            </div>
        </div>
    </>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BottomNav from '@/components/BottomNav';

export default function AdminLaporanDosen({ user }: { user?: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5242880) {
        Swal.fire({ icon: 'error', title: 'File terlalu besar!', text: 'Maksimal ukuran file adalah 5MB' });
        e.target.value = '';
        setPreview(null);
        setFoto(null);
        return;
      }
      setFoto(file);
      if (file.type.match('image.*')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setPreview(ev.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }
    } else {
      setPreview(null);
      setFoto(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.kronologi.length < 50) {
        Swal.fire({
            icon: 'warning',
            title: 'Kronologi terlalu singkat',
            text: 'Kronologi minimal 50 karakter agar dapat diproses dengan baik.'
        });
        return;
    }
    setLoading(true);

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => data.append(key, value));
      if (foto) data.append('bukti', foto);

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
    <div className="row justify-content-center">
        <div className="col-lg-8">
            <div className="card shadow-sm border-0 rounded-4 mb-5">
                <div className="card-header bg-white border-0 pt-4 pb-2 px-4">
                    <h4 className="fw-bold text-primary mb-0">
                        <i className="fas fa-chalkboard-teacher me-2"></i>
                        Laporan Kinerja Dosen
                    </h4>
                    <p className="text-muted small mb-0 mt-1">
                        Sampaikan laporan kinerja dosen secara profesional dan terstruktur
                    </p>
                </div>
                
                <div className="card-body p-4">
                    {/* Warning Etika */}
                    <div className="alert alert-warning border-0 shadow-sm mb-4">
                        <h6 className="fw-bold mb-2">
                            <i className="fas fa-exclamation-triangle me-2"></i>
                            Peringatan Etika Pelaporan:
                        </h6>
                        <ul className="mb-0 small">
                            <li><strong>DILARANG KERAS</strong> memfoto wajah dosen secara langsung</li>
                            <li>Laporan <strong>TIDAK BOLEH</strong> mengandung unsur penghinaan atau pencemaran nama baik</li>
                            <li>Foto bukti harus bersifat <strong>informatif</strong> (ruang kelas kosong, screenshot materi, jadwal, dll)</li>
                            <li>Laporan palsu akan diproses sesuai aturan akademik kampus</li>
                            <li>Identitas pelapor <strong>hanya terlihat oleh admin</strong> untuk tindak lanjut profesional</li>
                        </ul>
                    </div>

                    {/* Info Batas Harian */}
                    <div className="alert alert-info border-0 mb-4">
                        <i className="fas fa-info-circle me-2"></i>
                        <strong>Batas Pengiriman:</strong> Maksimal <strong>1 laporan setiap 2 hari</strong> per mahasiswa.
                    </div>

                    <form onSubmit={handleSubmit}>
                        
                        {/* Informasi Akademik */}
                        <h6 className="text-muted mb-3 mt-2">
                            <i className="fas fa-graduation-cap me-2"></i>Informasi Akademik
                        </h6>
                        
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <label className="form-label fw-bold">
                                    Nama Dosen <span className="text-danger">*</span>
                                </label>
                                <input type="text" name="nama_dosen" className="form-control" required 
                                       placeholder="Contoh: Dr. Ahmad Fauzi, M.Kom."
                                       value={formData.nama_dosen} onChange={e => setFormData({...formData, nama_dosen: e.target.value})} />
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label fw-bold">
                                    Mata Kuliah <span className="text-danger">*</span>
                                </label>
                                <input type="text" name="mata_kuliah" className="form-control" required 
                                       placeholder="Contoh: Pemrograman Web"
                                       value={formData.mata_kuliah} onChange={e => setFormData({...formData, mata_kuliah: e.target.value})} />
                            </div>
                        </div>
                        
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <label className="form-label fw-bold">Kelas</label>
                                <input type="text" name="kelas" className="form-control" 
                                       placeholder="Contoh: 3A / SI-A"
                                       value={formData.kelas} onChange={e => setFormData({...formData, kelas: e.target.value})} />
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label fw-bold">Semester</label>
                                <select name="semester" className="form-select"
                                        value={formData.semester} onChange={e => setFormData({...formData, semester: e.target.value})}>
                                    <option value="">Pilih Semester</option>
                                    <option value="1">Semester 1 (Ganjil)</option>
                                    <option value="2">Semester 2 (Genap)</option>
                                    <option value="3">Semester 3 (Ganjil)</option>
                                    <option value="4">Semester 4 (Genap)</option>
                                    <option value="5">Semester 5 (Ganjil)</option>
                                    <option value="6">Semester 6 (Genap)</option>
                                    <option value="7">Semester 7 (Ganjil)</option>
                                    <option value="8">Semester 8 (Genap)</option>
                                </select>
                            </div>
                        </div>

                        <hr className="my-4" />

                        {/* Detail Laporan */}
                        <h6 className="text-muted mb-3">
                            <i className="fas fa-file-alt me-2"></i>Detail Laporan
                        </h6>
                        
                        <div className="mb-3">
                            <label className="form-label fw-bold">
                                Judul Laporan <span className="text-danger">*</span>
                            </label>
                            <input type="text" name="judul" className="form-control" required 
                                   placeholder="Contoh: Dosen Tidak Hadir 3 Kali Berturut-turut Tanpa Keterangan"
                                   value={formData.judul} onChange={e => setFormData({...formData, judul: e.target.value})} />
                        </div>
                        
                        <div className="mb-3">
                            <label className="form-label fw-bold">
                                Kronologi Kejadian <span className="text-danger">*</span>
                            </label>
                            <textarea name="kronologi" className="form-control" rows={5} required 
                                      placeholder="Jelaskan kronologi secara detail..."
                                      value={formData.kronologi} onChange={e => setFormData({...formData, kronologi: e.target.value})}></textarea>
                            <small className="text-muted">Minimal 50 karakter</small>
                        </div>
                        
                        <div className="mb-3">
                            <label className="form-label fw-bold">Dampak terhadap Pembelajaran</label>
                            <textarea name="dampak" className="form-control" rows={3} 
                                      placeholder="Jelaskan dampak kejadian ini terhadap proses pembelajaran Anda dan teman-teman sekelas..."
                                      value={formData.dampak} onChange={e => setFormData({...formData, dampak: e.target.value})}></textarea>
                        </div>
                        
                        <div className="mb-4">
                            <label className="form-label fw-bold">
                                Bukti Pendukung <span className="text-danger">*</span>
                            </label>
                            <input type="file" name="bukti" className="form-control" accept="image/*,.pdf" required onChange={handleFileChange} />
                            <small className="text-muted">
                                <i className="fas fa-info-circle me-1"></i>
                                Format: PNG, JPG, JPEG, PDF. Maksimal 5MB. 
                                <strong className="text-danger">JANGAN foto wajah dosen!</strong>
                            </small>
                            
                            {/* Preview Foto */}
                            {preview && (
                            <div className="mt-2">
                                <img src={preview} alt="Preview" className="img-thumbnail" style={{ maxHeight: '200px' }} />
                            </div>
                            )}
                        </div>

                        {/* Persetujuan */}
                        <div className="form-check mb-4 p-3 bg-light rounded-3">
                            <input className="form-check-input" type="checkbox" id="persetujuan" required />
                            <label className="form-check-label small" htmlFor="persetujuan">
                                Saya menyatakan bahwa laporan ini adalah <strong>benar</strong> dan dibuat dengan 
                                <strong>itikad baik</strong> untuk perbaikan kualitas pembelajaran. Saya memahami 
                                bahwa laporan palsu dapat dikenakan sanksi akademik.
                            </label>
                        </div>
                        
                        <div className="d-flex gap-2">
                            <button type="submit" className="btn btn-primary flex-fill fw-bold" disabled={loading}>
                                <i className="fas fa-paper-plane me-2"></i>{loading ? 'Mengirim...' : 'Kirim Laporan'}
                            </button>
                            <Link href="/dashboard" className="btn btn-outline-secondary">
                                <i className="fas fa-times me-2"></i>Batal
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
  );
}

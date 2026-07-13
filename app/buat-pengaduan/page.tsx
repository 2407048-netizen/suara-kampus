'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

export default function BuatPengaduan() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    judul: '',
    kategori: '',
    prioritas: 'Sedang',
    lokasi: '',
    deskripsi: ''
  });
  const [foto, setFoto] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => data.append(key, value));
      if (foto) data.append('foto', foto);

      const res = await fetch('/api/laporan', {
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
        <div className="col-md-8">
            <div className="card shadow-sm p-4 border-0 rounded-4">
                <h4 className="mb-4 text-primary"><i className="fas fa-plus-circle me-2"></i>Lapor Cepat</h4>
                <div className="alert alert-info d-flex align-items-center border-0 rounded-3">
                    <i className="fas fa-user-secret me-2"></i>
                    <div>Identitas Anda akan disembunyikan secara otomatis. Laporan bersifat anonim.</div>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label fw-bold">Judul Laporan</label>
                        <input 
                            type="text" 
                            name="judul" 
                            className="form-control rounded-3" 
                            placeholder="Contoh: AC Ruang Lab 3 Tidak Dingin" 
                            value={formData.judul}
                            onChange={(e) => setFormData({...formData, judul: e.target.value})}
                            required 
                        />
                    </div>
                    <div className="row g-3 mb-3">
                        <div className="col-md-6">
                            <label className="form-label fw-bold">Kategori</label>
                            <select 
                                name="kategori" 
                                className="form-select rounded-3" 
                                value={formData.kategori}
                                onChange={(e) => setFormData({...formData, kategori: e.target.value})}
                                required
                            >
                                <option value="">-- Pilih Kategori --</option>
                                <option value="Fasilitas Kelas">Fasilitas Kelas</option>
                                <option value="Ruangan Lab">Ruangan Lab</option>
                                <option value="Jaringan WiFi">Jaringan WiFi</option>
                                <option value="Kinerja Dosen">Kinerja Dosen</option>
                                <option value="Layanan Kampus">Layanan Kampus</option>
                                <option value="Himpunan/Organisasi">Himpunan/Organisasi</option>
                                <option value="TUK (Tenaga Kependidikan)">TUK (Tenaga Kependidikan)</option>
                                <option value="Prodi/Jurusan">Prodi/Jurusan</option>
                            </select>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-bold">Prioritas</label>
                            <select 
                                name="prioritas" 
                                className="form-select rounded-3" 
                                value={formData.prioritas}
                                onChange={(e) => setFormData({...formData, prioritas: e.target.value})}
                                required
                            >
                                <option value="Rendah">Rendah</option>
                                <option value="Sedang">Sedang</option>
                                <option value="Tinggi">Tinggi</option>
                                <option value="Urgent">🚨 Urgent (Darurat)</option>
                            </select>
                        </div>
                    </div>
                    <div className="mb-3">
                        <label className="form-label fw-bold">Lokasi Spesifik</label>
                        <input 
                            type="text" 
                            name="lokasi" 
                            className="form-control rounded-3" 
                            placeholder="Gedung A, Lantai 2, Ruang 201" 
                            value={formData.lokasi}
                            onChange={(e) => setFormData({...formData, lokasi: e.target.value})}
                            required 
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label fw-bold">Deskripsi Masalah</label>
                        <textarea 
                            name="deskripsi" 
                            className="form-control rounded-3" 
                            rows={4} 
                            placeholder="Jelaskan detail masalah..." 
                            value={formData.deskripsi}
                            onChange={(e) => setFormData({...formData, deskripsi: e.target.value})}
                            required
                        ></textarea>
                    </div>
                    <div className="mb-4">
                        <label className="form-label fw-bold">Foto Bukti (Opsional)</label>
                        <input 
                            type="file" 
                            name="foto" 
                            className="form-control rounded-3" 
                            accept="image/*"
                            onChange={(e) => setFoto(e.target.files?.[0] || null)}
                        />
                    </div>
                    <div className="d-grid">
                        <button type="submit" className="btn btn-itg btn-lg rounded-3" disabled={loading}>
                            <i className="fas fa-paper-plane me-2"></i>{loading ? 'Mengirim...' : 'Kirim Laporan & Generate PDF'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
  );
}

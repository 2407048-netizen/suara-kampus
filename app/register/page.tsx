'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

export default function Register() {
  const [nim, setNim] = useState('');
  const [nama, setNama] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();

  const getEmailPreview = () => {
    return nim.trim().length > 0 ? `${nim.trim()}@itg.ac.id` : '';
  };

  const getPasswordStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Za-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++; // Karakter spesial

    const levels = [
      { pct: '0%',   cls: '',                  text: '' },
      { pct: '33%',  cls: 'bg-danger',         text: 'Lemah' },
      { pct: '66%',  cls: 'bg-warning',        text: 'Sedang' },
      { pct: '85%',  cls: 'bg-info',           text: 'Kuat' },
      { pct: '100%', cls: 'bg-success',        text: 'Sangat Kuat' },
    ];
    return levels[Math.min(score, 4)];
  };

  const strength = getPasswordStrength();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== password2) {
      Swal.fire({
        toast: true, position: 'top-end', icon: 'error',
        title: 'Password tidak cocok', showConfirmButton: false, timer: 3000
      });
      return;
    }
    
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nim, nama, email: getEmailPreview(), password }),
      });

      const data = await res.json();

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Registrasi Berhasil',
          text: data.message,
          confirmButtonText: 'Lanjut Verifikasi OTP',
          confirmButtonColor: '#003366'
        }).then(() => {
          router.push(`/verify-otp?nim=${nim}`);
        });
      } else {
        Swal.fire({
          toast: true, position: 'top-end', icon: 'error',
          title: data.message || 'Registrasi gagal', showConfirmButton: false, timer: 3000
        });
      }
    } catch (err) {
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
        <div className="col-md-6">
            <div className="card shadow">
                <div className="card-header bg-warning text-dark text-center py-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/logo-itg.png" alt="Logo ITG" width="80" height="80" className="mb-3 bg-white rounded-circle p-1 shadow-sm" />
                    <h4 className="mb-0 fw-bold">Registrasi Akun Mahasiswa</h4>
                </div>
                <div className="card-body p-4">
                    <div className="alert alert-info">
                        <i className="fas fa-info-circle me-2"></i>
                        <strong>SSO ITG:</strong> Email <code>{'{NIM}'}@itg.ac.id</code> dibuat otomatis dari NIM Anda.
                    </div>

                    <form onSubmit={handleRegister} noValidate>
                        {/* NIM */}
                        <div className="mb-3">
                            <label className="form-label fw-bold">NIM <span className="text-danger">*</span></label>
                            <input 
                                type="text" 
                                className="form-control"
                                placeholder="Contoh: 2407048"
                                value={nim}
                                onChange={(e) => setNim(e.target.value)}
                                required 
                            />
                            <div className="form-text">NIM aktif mahasiswa ITG (7-12 digit angka)</div>
                        </div>

                        {/* Nama Lengkap */}
                        <div className="mb-3">
                            <label className="form-label fw-bold">Nama Lengkap <span className="text-danger">*</span></label>
                            <input 
                                type="text" 
                                className="form-control"
                                placeholder="Sesuai Kartu Tanda Mahasiswa"
                                value={nama}
                                onChange={(e) => setNama(e.target.value)}
                                required 
                                minLength={3} 
                            />
                        </div>

                        {/* Email Preview (Read Only) */}
                        <div className="mb-3">
                            <label className="form-label fw-bold">Email Kampus (Otomatis)</label>
                            <input 
                                type="text" 
                                className="form-control bg-light text-muted"
                                placeholder="Otomatis dari NIM" 
                                value={getEmailPreview()}
                                readOnly 
                            />
                            <div className="form-text"><i className="fas fa-lock me-1"></i>Email dihasilkan otomatis, tidak bisa diubah.</div>
                        </div>

                        {/* Password */}
                        <div className="mb-3">
                            <label className="form-label fw-bold">Password <span className="text-danger">*</span></label>
                            <div className="input-group">
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    className="form-control"
                                    placeholder="Minimal 8 karakter + angka"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required 
                                />
                                <button className="btn btn-outline-secondary" type="button" onClick={() => setShowPassword(!showPassword)}>
                                    <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                                </button>
                            </div>
                            {/* Password Strength Meter */}
                            <div className="mt-1">
                                <div className="progress" style={{ height: '5px' }}>
                                    <div className={`progress-bar ${strength.cls}`} role="progressbar" style={{ width: strength.pct }}></div>
                                </div>
                                <small className="text-muted">{strength.text}</small>
                            </div>
                            <div className="form-text">Minimal 8 karakter, mengandung huruf dan angka.</div>
                        </div>

                        {/* Konfirmasi Password */}
                        <div className="mb-4">
                            <label className="form-label fw-bold">Konfirmasi Password <span className="text-danger">*</span></label>
                            <div className="input-group">
                                <input 
                                    type={showPassword2 ? "text" : "password"} 
                                    className="form-control"
                                    placeholder="Ulangi password Anda"
                                    value={password2}
                                    onChange={(e) => setPassword2(e.target.value)}
                                    required 
                                />
                                <button className="btn btn-outline-secondary" type="button" onClick={() => setShowPassword2(!showPassword2)}>
                                    <i className={showPassword2 ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                                </button>
                            </div>
                            <small className={password2 ? (password === password2 ? 'text-success' : 'text-danger') : 'text-muted'}>
                                {password2 ? (password === password2 ? '✓ Password cocok' : '✗ Password tidak cocok') : ''}
                            </small>
                        </div>

                        <button type="submit" className="btn btn-warning text-white fw-bold w-100" disabled={loading}>
                            <i className="fas fa-user-plus me-2"></i>{loading ? 'Memproses...' : 'Daftar Akun'}
                        </button>
                    </form>

                    <div className="text-center mt-3">
                        <small>Sudah punya akun? <Link href="/login">Login disini</Link></small>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}

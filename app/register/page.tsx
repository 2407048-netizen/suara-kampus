'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Swal from 'sweetalert2';

export default function Register() {
  const router = useRouter();
  const [nim, setNim] = useState('');
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Password strength state
  const [strengthScore, setStrengthScore] = useState(0);
  const [strengthLevel, setStrengthLevel] = useState({ pct: '0%', cls: '', text: '' });
  const [matchStatus, setMatchStatus] = useState({ cls: '', text: '' });

  useEffect(() => {
    setEmail(nim.length > 0 ? `${nim}@itg.ac.id` : '');
  }, [nim]);

  useEffect(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Za-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const levels = [
      { pct: '0%', cls: '', text: '' },
      { pct: '33%', cls: 'bg-danger', text: 'Lemah' },
      { pct: '66%', cls: 'bg-warning', text: 'Sedang' },
      { pct: '85%', cls: 'bg-info', text: 'Kuat' },
      { pct: '100%', cls: 'bg-success', text: 'Sangat Kuat' },
    ];
    
    setStrengthScore(score);
    setStrengthLevel(levels[Math.min(score, 4)]);
    
    // Check match
    if (!passwordConfirm) {
      setMatchStatus({ cls: '', text: '' });
    } else if (password === passwordConfirm) {
      setMatchStatus({ cls: 'text-success', text: '✓ Password cocok' });
    } else {
      setMatchStatus({ cls: 'text-danger', text: '✗ Password tidak cocok' });
    }
  }, [password, passwordConfirm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== passwordConfirm) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Password tidak cocok!' });
      return;
    }
    
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nim, nama, email, password })
      });

      const data = await res.json();

      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'Berhasil', text: data.message, timer: 1500, showConfirmButton: false });
        router.push('/login');
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
      <Navbar user={null} />
      <div className="container" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <div className="row justify-content-center mt-5">
          <div className="col-md-6">
            <div className="card shadow">
              <div className="card-header bg-warning text-dark text-center">
                <h4 className="mb-0"><i className="fas fa-user-plus me-2"></i>Registrasi Akun Mahasiswa</h4>
              </div>
              <div className="card-body">
                <div className="alert alert-info">
                  <i className="fas fa-info-circle me-2"></i>
                  <strong>SSO ITG:</strong> Email <code>{'{NIM}'}@itg.ac.id</code> dibuat otomatis dari NIM Anda.
                </div>

                <form onSubmit={handleSubmit} noValidate>
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

                  {/* Email Preview */}
                  <div className="mb-3">
                    <label className="form-label fw-bold">Email Kampus (Otomatis)</label>
                    <input 
                      type="text" 
                      className="form-control bg-light text-muted"
                      placeholder="Otomatis dari NIM" 
                      value={email}
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
                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                    {/* Password Strength Meter */}
                    <div className="mt-1">
                      <div className="progress" style={{ height: '5px' }}>
                        <div className={`progress-bar ${strengthLevel.cls}`} role="progressbar" style={{ width: strengthLevel.pct }}></div>
                      </div>
                      <small className="text-muted">{strengthLevel.text}</small>
                    </div>
                    <div className="form-text">Minimal 8 karakter, mengandung huruf dan angka.</div>
                  </div>

                  {/* Konfirmasi Password */}
                  <div className="mb-4">
                    <label className="form-label fw-bold">Konfirmasi Password <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <input 
                        type={showPasswordConfirm ? "text" : "password"} 
                        className="form-control"
                        placeholder="Ulangi password Anda"
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        required 
                      />
                      <button className="btn btn-outline-secondary" type="button" onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}>
                        <i className={`fas ${showPasswordConfirm ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                    <small className={matchStatus.cls}>{matchStatus.text}</small>
                  </div>

                  <button type="submit" className="btn btn-warning text-white fw-bold w-100" disabled={isLoading || strengthScore < 2 || password !== passwordConfirm}>
                    {isLoading ? (
                      <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Loading...</>
                    ) : (
                      <><i className="fas fa-user-plus me-2"></i>Daftar Akun</>
                    )}
                  </button>
                </form>

                <div className="text-center mt-3">
                  <small>Sudah punya akun? <Link href="/login">Login disini</Link></small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

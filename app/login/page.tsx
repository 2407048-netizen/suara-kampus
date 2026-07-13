'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Swal from 'sweetalert2';

function LoginContent() {
  const [role, setRole] = useState<'mahasiswa' | 'admin'>('mahasiswa');
  const [nim, setNim] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const verified = searchParams.get('verified');
    const error = searchParams.get('error');
    if (verified === '1') {
      Swal.fire({
        toast: true, position: 'top-end', icon: 'success',
        title: 'Email berhasil diverifikasi! Silakan login.', showConfirmButton: false, timer: 3000
      });
      router.replace('/login');
    } else if (error === 'invalid_token') {
      Swal.fire({
        toast: true, position: 'top-end', icon: 'error',
        title: 'Token verifikasi tidak valid atau tidak ditemukan.', showConfirmButton: false, timer: 3000
      });
      router.replace('/login');
    } else if (error === 'token_expired') {
      Swal.fire({
        toast: true, position: 'top-end', icon: 'error',
        title: 'Token verifikasi kadaluarsa.', showConfirmButton: false, timer: 3000
      });
      router.replace('/login');
    }
  }, [searchParams, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nim, password, role }),
      });

      const data = await res.json();

      if (res.ok) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Login berhasil!',
          showConfirmButton: false,
          timer: 1500
        }).then(() => {
          if (role === 'admin') {
            router.push('/admin/dashboard');
          } else {
            router.push('/dashboard');
          }
        });
      } else {
        if (data.error_code === 'UNVERIFIED') {
          Swal.fire({
            title: 'Akun Belum Diverifikasi',
            text: 'Akun Anda belum diverifikasi. Silakan masukkan kode OTP yang telah dikirim ke email kampus Anda.',
            icon: 'warning',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: 'Masukkan OTP',
            denyButtonText: 'Kirim Ulang OTP',
            cancelButtonText: 'Batal'
          }).then(async (result) => {
            if (result.isConfirmed) {
              router.push(`/verify-otp?nim=${nim}`);
            } else if (result.isDenied) {
              setLoading(true);
              try {
                const resendRes = await fetch('/api/auth/resend-otp', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ nim })
                });
                const resendData = await resendRes.json();
                if (resendRes.ok) {
                  Swal.fire({ icon: 'success', title: 'Berhasil', text: resendData.message })
                    .then(() => router.push(`/verify-otp?nim=${nim}`));
                } else {
                  Swal.fire('Gagal', resendData.message, 'error');
                }
              } catch (e) {
                Swal.fire('Error', 'Terjadi kesalahan jaringan', 'error');
              } finally {
                setLoading(false);
              }
            }
          });
        } else {
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'error',
            title: data.message || 'Login gagal',
            showConfirmButton: false,
            timer: 3000
          });
        }
      }
    } catch (err) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'Terjadi kesalahan jaringan',
        showConfirmButton: false,
        timer: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="row justify-content-center">
        <div className="col-md-6">
            <div className="card shadow">
                <div className="card-header bg-primary text-white text-center py-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/logo-itg.png" alt="Logo ITG" width="80" height="80" className="mb-3 bg-white rounded-circle p-1 shadow-sm" />
                    <h4 className="mb-0 fw-bold">Login Sistem</h4>
                </div>
                <div className="card-body p-4">
                    {/* TOMBOL PILIH ROLE */}
                    <div className="btn-group w-100 mb-4" role="group">
                        <button 
                            type="button" 
                            className={`btn btn-outline-primary ${role === 'mahasiswa' ? 'active' : ''}`}
                            onClick={() => {
                                setRole('mahasiswa');
                                setNim('');
                            }}
                        >
                            <i className="fas fa-user-graduate me-2"></i>Mahasiswa
                        </button>
                        <button 
                            type="button" 
                            className={`btn btn-outline-danger ${role === 'admin' ? 'active' : ''}`}
                            onClick={() => {
                                setRole('admin');
                                setNim('ADMIN001');
                            }}
                        >
                            <i className="fas fa-user-shield me-2"></i>Admin
                        </button>
                    </div>

                    <form onSubmit={handleLogin}>
                        <div className="mb-3">
                            <label className="form-label fw-bold">NIM / NIP</label>
                            <input 
                                type="text" 
                                name="nim" 
                                className="form-control" 
                                placeholder={role === 'mahasiswa' ? "Masukkan NIM Mahasiswa" : "ADMIN001"} 
                                value={nim}
                                onChange={(e) => setNim(e.target.value)}
                                required 
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label fw-bold">Password</label>
                            <input 
                                type="password" 
                                name="password" 
                                className="form-control" 
                                placeholder="Masukkan password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required 
                            />
                        </div>
                        
                        {/* Info Login Admin (Muncul hanya saat pilih Admin) */}
                        <div className={`alert alert-danger ${role === 'admin' ? '' : 'd-none'}`}>
                            <i className="fas fa-info-circle me-2"></i>
                            <strong>Login Admin:</strong> Gunakan NIM <code>ADMIN001</code> dan password yang telah ditetapkan.
                        </div>

                        <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                            <i className="fas fa-sign-in-alt me-2"></i>{loading ? 'Memproses...' : 'Masuk'}
                        </button>
                    </form>
                    <div className="text-center mt-3">
                        <small>Belum punya akun? <Link href="/register">Daftar disini</Link></small>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}

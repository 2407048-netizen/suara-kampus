'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Swal from 'sweetalert2';

export default function Login() {
  const router = useRouter();
  const [role, setRole] = useState<'mahasiswa' | 'admin'>('mahasiswa');
  const [nim, setNim] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSwitch = (newRole: 'mahasiswa' | 'admin') => {
    setRole(newRole);
    if (newRole === 'admin') {
      setNim('ADMIN001');
    } else {
      setNim('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nim, password })
      });

      const data = await res.json();

      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'Berhasil', text: data.message, timer: 1500, showConfirmButton: false });
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
      <Navbar user={null} />
      <div className="container" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <div className="row justify-content-center mt-5">
          <div className="col-md-6">
            <div className="card shadow">
              <div className="card-header bg-primary text-white text-center">
                <h4 className="mb-0"><i className="fas fa-sign-in-alt me-2"></i>Login Sistem</h4>
              </div>
              <div className="card-body">
                {/* TOMBOL PILIH ROLE */}
                <div className="btn-group w-100 mb-4" role="group">
                  <button 
                    type="button" 
                    className={`btn btn-outline-primary ${role === 'mahasiswa' ? 'active' : ''}`}
                    onClick={() => handleRoleSwitch('mahasiswa')}
                  >
                    <i className="fas fa-user-graduate me-2"></i>Mahasiswa
                  </button>
                  <button 
                    type="button" 
                    className={`btn btn-outline-danger ${role === 'admin' ? 'active' : ''}`}
                    onClick={() => handleRoleSwitch('admin')}
                  >
                    <i className="fas fa-user-shield me-2"></i>Admin
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label fw-bold">NIM / NIP</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder={role === 'mahasiswa' ? 'Masukkan NIM Mahasiswa' : 'ADMIN001'}
                      value={nim}
                      onChange={(e) => setNim(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Password</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      placeholder="Masukkan password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                    />
                  </div>
                  
                  {/* Info Login Admin */}
                  {role === 'admin' && (
                    <div className="alert alert-danger">
                      <i className="fas fa-info-circle me-2"></i>
                      <strong>Login Admin:</strong> Gunakan NIM <code>ADMIN001</code> dan password yang telah ditetapkan.
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary w-100" disabled={isLoading}>
                    {isLoading ? (
                      <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Loading...</>
                    ) : (
                      <><i className="fas fa-sign-in-alt me-2"></i>Masuk</>
                    )}
                  </button>
                </form>
                <div className="text-center mt-3">
                  <small>Belum punya akun? <Link href="/register">Daftar disini</Link></small>
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

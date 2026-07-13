'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';
import Image from 'next/image';

export default function VerifyOtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nim = searchParams.get('nim') || '';

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 menit (600 detik)

  useEffect(() => {
    if (!nim) {
      router.push('/login');
    }
  }, [nim, router]);

  useEffect(() => {
    // Countdown timer
    if (timeLeft <= 0) return;

    const timerId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Masukkan 6 digit OTP', showConfirmButton: false, timer: 3000 });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nim, otp })
      });

      const data = await res.json();

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil',
          text: 'Akun Anda berhasil diverifikasi!',
          confirmButtonText: 'Lanjut Login',
          confirmButtonColor: '#003366'
        }).then(() => {
          router.push('/login');
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: data.message || 'OTP tidak valid.',
          confirmButtonColor: '#003366'
        });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Terjadi kesalahan jaringan.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nim })
      });

      const data = await res.json();

      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'Terkirim', text: data.message });
        setTimeLeft(600); // Reset timer 10 menit
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal', text: data.message });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Terjadi kesalahan jaringan.' });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: '#f4f6f9' }}>
      <div className="card shadow-lg border-0 rounded-lg" style={{ maxWidth: '450px', width: '100%' }}>
        <div className="card-header text-center bg-white border-0 pt-4 pb-0">
          <Image src="/images/logo-itg.png" alt="Logo ITG" width={80} height={80} className="mb-3" />
          <h3 className="fw-bold" style={{ color: '#003366' }}>Verifikasi OTP</h3>
          <p className="text-muted mb-0">Kode telah dikirim ke email kampus Anda:</p>
          <p className="fw-bold text-dark">{nim}@itg.ac.id</p>
        </div>
        
        <div className="card-body p-4">
          <form onSubmit={handleVerify}>
            <div className="mb-4 text-center">
              <label className="form-label fw-bold">Masukkan 6 Digit Kode OTP</label>
              <input
                type="text"
                className="form-control form-control-lg text-center"
                placeholder="• • • • • •"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                style={{ fontSize: '24px', letterSpacing: '10px' }}
                required
              />
            </div>

            <div className="text-center mb-4">
              <span className="badge bg-light text-dark fs-6 border border-secondary">
                <i className="fas fa-clock me-2 text-primary"></i> Waktu tersisa: {formatTime(timeLeft)}
              </span>
            </div>

            <button type="submit" className="btn btn-primary w-100 py-2 mb-3" disabled={loading || timeLeft <= 0}>
              {loading ? <i className="fas fa-spinner fa-spin me-2"></i> : <i className="fas fa-check-circle me-2"></i>}
              {loading ? 'Memverifikasi...' : 'Verifikasi'}
            </button>
            
            <button 
              type="button" 
              onClick={handleResend} 
              className="btn btn-outline-secondary w-100 py-2" 
              disabled={resending}
            >
              {resending ? <i className="fas fa-spinner fa-spin me-2"></i> : <i className="fas fa-envelope me-2"></i>}
              Kirim Ulang OTP
            </button>
          </form>
        </div>
        <div className="card-footer text-center bg-light border-0 py-3">
          <small>Kembali ke <Link href="/login" className="text-decoration-none">Halaman Login</Link></small>
        </div>
      </div>
    </div>
  );
}

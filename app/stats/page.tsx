export const dynamic = 'force-dynamic';

import db from '@/lib/db';
import Link from 'next/link';

export default async function StatsPage() {
  // Calculate statistics
  const total_keluhan = (db.prepare(`SELECT COUNT(*) as count FROM reports WHERE kategori != 'Aspirasi & Saran' AND is_deleted = 0`).get() as any).count;
  const selesai = (db.prepare(`SELECT COUNT(*) as count FROM reports WHERE kategori != 'Aspirasi & Saran' AND status = 'Selesai' AND is_deleted = 0`).get() as any).count;
  const total_aspirasi = (db.prepare(`SELECT COUNT(*) as count FROM aspirations WHERE is_deleted = 0`).get() as any).count;
  
  const persen = total_keluhan > 0 ? Math.round((selesai / total_keluhan) * 100) : 0;

  return (
    <>
        <div className="row justify-content-center mb-4">
            <div className="col-md-8 text-center">
                <h2 className="mb-4">Statistik Pelayanan Kampus</h2>
                <p className="text-muted">Transparansi adalah kunci kepercayaan. Berikut performa kami.</p>
            </div>
        </div>

        <div className="row g-4">
            {/* Kartu 1: Total Laporan */}
            <div className="col-md-4">
                <div className="card h-100 border-primary shadow-sm text-center p-4 rounded-4">
                    <div className="card-body">
                        <i className="fas fa-file-alt fa-3x text-primary mb-3"></i>
                        <h3 className="display-4 fw-bold">{total_keluhan}</h3>
                        <p className="text-muted fw-bold">Total Keluhan Masuk</p>
                    </div>
                </div>
            </div>

            {/* Kartu 2: Persentase Selesai */}
            <div className="col-md-4">
                <div className="card h-100 border-success shadow-sm text-center p-4 rounded-4">
                    <div className="card-body">
                        <i className="fas fa-check-circle fa-3x text-success mb-3"></i>
                        <h3 className="display-4 fw-bold text-success">{persen}%</h3>
                        <p className="text-muted fw-bold">Tingkat Penyelesaian</p>
                        <div className="progress mt-2" style={{ height: '10px' }}>
                            <div className="progress-bar bg-success" role="progressbar" style={{ width: `${persen}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Kartu 3: Aspirasi */}
            <div className="col-md-4">
                <div className="card h-100 border-warning shadow-sm text-center p-4 rounded-4">
                    <div className="card-body">
                        <i className="fas fa-lightbulb fa-3x text-warning mb-3"></i>
                        <h3 className="display-4 fw-bold text-warning">{total_aspirasi}</h3>
                        <p className="text-muted fw-bold">Ide Mahasiswa Diterima</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Link Kembali */}
        <div className="text-center mt-5">
            <Link href="/" className="btn btn-outline-secondary rounded-pill px-4">
                <i className="fas fa-arrow-left me-2"></i> Kembali ke Beranda
            </Link>
        </div>
    </>
  );
}

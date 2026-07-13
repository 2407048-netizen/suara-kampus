import Link from 'next/link';

export default function Home() {
  return (
    <>
      <div className="row justify-content-center mt-5">
          <div className="col-md-10 text-center">
              <div className="card p-5 shadow-sm border-0">
                  <h1 className="display-5 fw-bold text-primary mb-3">Selamat Datang di Suara Kampus</h1>
                  <p className="lead text-muted mb-4">
                      Platform resmi pengaduan fasilitas Institut Teknologi Garut.<br />
                      Sampaikan keluhan, pantau perbaikan, wujudkan kampus yang lebih nyaman.
                  </p>

                  <div className="d-grid gap-3 d-sm-flex justify-content-sm-center mb-4">
                      <Link href="/register" className="btn btn-itg btn-lg px-4 gap-3">
                          <i className="fas fa-user-plus me-2"></i>Daftar Akun
                      </Link>
                      <Link href="/login" className="btn btn-outline-primary btn-lg px-4">
                          <i className="fas fa-sign-in-alt me-2"></i>Login
                      </Link>
                  </div>

                  <div className="alert alert-info mt-4 text-start mx-auto" style={{ maxWidth: '600px' }}>
                      <h5 className="alert-heading"><i className="fas fa-info-circle me-2"></i>Info Login</h5>
                      <p className="mb-0 small">
                          • <strong>Mahasiswa:</strong> Login menggunakan NIM dan password yang sudah didaftarkan.<br />
                          • <strong>Admin:</strong> Login menggunakan NIM khusus (ADMIN001).
                      </p>
                  </div>
              </div>
          </div>
      </div>

      {/* Fitur Highlight Section */}
      <div className="row mt-5 g-4">
          <div className="col-md-4">
              <div className="card h-100 text-center p-4 border-0 shadow-sm">
                  <i className="fas fa-bolt fa-3x text-warning mb-3"></i>
                  <h5>Cepat & Efisien</h5>
                  <p className="text-muted">Laporkan masalah fasilitas dalam hitungan detik langsung ke pihak terkait.</p>
              </div>
          </div>
          <div className="col-md-4">
              <div className="card h-100 text-center p-4 border-0 shadow-sm">
                  <i className="fas fa-search-plus fa-3x text-primary mb-3"></i>
                  <h5>Tracking Real-time</h5>
                  <p className="text-muted">Pantau status pengaduan Anda dari Open hingga Selesai secara transparan.</p>
              </div>
          </div>
          <div className="col-md-4">
              <div className="card h-100 text-center p-4 border-0 shadow-sm">
                  <i className="fas fa-shield-alt fa-3x text-success mb-3"></i>
                  <h5>Terjamin & Aman</h5>
                  <p className="text-muted">Data Anda tersimpan aman dan hanya dapat diakses oleh admin berwenang.</p>
              </div>
          </div>
      </div>
    </>
  );
}

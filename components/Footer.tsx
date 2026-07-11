export default function Footer() {
  return (
    <footer className="bg-white py-5 border-top mt-auto">
      <div className="container">
        <div className="row g-4 justify-content-between align-items-center">
          <div className="col-md-6 text-center text-md-start">
            <h5 className="fw-bold text-primary mb-2">Suara Kampus ITG</h5>
            <p className="text-muted small mb-0">Platform resmi penyampaian aspirasi dan pengaduan mahasiswa Institut Teknologi Garut.</p>
          </div>
          <div className="col-md-4 text-center text-md-end">
            <div className="d-flex gap-3 justify-content-center justify-content-md-end mb-2">
              <a href="#" className="text-muted text-decoration-none hover-primary"><i className="fab fa-instagram fa-lg"></i></a>
              <a href="#" className="text-muted text-decoration-none hover-primary"><i className="fab fa-twitter fa-lg"></i></a>
              <a href="#" className="text-muted text-decoration-none hover-primary"><i className="fab fa-facebook fa-lg"></i></a>
            </div>
            <p className="text-muted small mb-0">&copy; 2026 Institut Teknologi Garut. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

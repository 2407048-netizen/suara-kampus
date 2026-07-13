export const dynamic = 'force-dynamic';

import db from '@/lib/db';

export default async function FAQPage() {
  return (
    <div className="row justify-content-center">
        <div className="col-md-8">
            <div className="card shadow-sm p-4 border-0 rounded-4">
                <h3 className="mb-4 text-primary"><i className="fas fa-book-open me-2"></i>FAQ &amp; Panduan Layanan</h3>
                <div className="accordion" id="faqAccordion">
                    <div className="accordion-item">
                        <h2 className="accordion-header"><button className="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#faq1">Bagaimana cara melapor?</button></h2>
                        <div id="faq1" className="accordion-collapse collapse show" data-bs-parent="#faqAccordion">
                            <div className="accordion-body">Klik menu <strong>Keluhan</strong> atau tombol <strong>Lapor Cepat</strong>, pilih kategori, isi detail, dan kirim. Sistem akan otomatis membuat PDF bukti laporan.</div>
                        </div>
                    </div>
                    <div className="accordion-item">
                        <h2 className="accordion-header"><button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq2">Apakah identitas saya aman?</button></h2>
                        <div id="faq2" className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                            <div className="accordion-body">Ya. Sistem menggunakan <strong>Privacy-by-Default</strong>. Nama dan NIM tidak akan ditampilkan di daftar publik. Hanya admin berwenang yang dapat melihat data pelapor.</div>
                        </div>
                    </div>
                    <div className="accordion-item">
                        <h2 className="accordion-header"><button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq3">Berapa lama laporan diproses?</button></h2>
                        <div id="faq3" className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                            <div className="accordion-body">Standar SLA kampus adalah <strong>3x24 jam</strong> untuk status Diproses, dan <strong>7 hari kerja</strong> untuk status Selesai. Anda akan mendapat notifikasi email setiap ada perubahan.</div>
                        </div>
                    </div>
                    <div className="accordion-item">
                        <h2 className="accordion-header"><button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq4">Bagaimana cara mendukung aspirasi?</button></h2>
                        <div id="faq4" className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                            <div className="accordion-body">Buka menu <strong>Aspirasi</strong>, pilih usulan yang Anda dukung, lalu klik tombol <strong>&quot;Dukung&quot;</strong>. Aspirasi dengan dukungan terbanyak akan diprioritaskan oleh admin.</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}

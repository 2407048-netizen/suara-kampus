import os
import io
from flask import Flask, render_template, request, redirect, url_for, session, flash, send_file
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import datetime
from fpdf import FPDF
from flask_mail import Mail, Message

# ================= KONFIGURASI APLIKASI =================
app = Flask(__name__)
app.config['SECRET_KEY'] = 'suara_kampus_itgarut_2026'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///suara_kampus.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # Max 5MB

# ================= KONFIGURASI EMAIL (GMAIL - TESTING) =================
# PENTING: Ganti dengan email Gmail Anda dan App Password
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True').lower() in ('true', '1', 'yes')
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME', 'email_anda@gmail.com')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD', 'app_password_16_digit')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', 'Suara Kampus ITG <email_anda@gmail.com>')

mail = Mail(app)

# Inisialisasi Database
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
db = SQLAlchemy(app)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ================= DATABASE MODELS =================
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nim = db.Column(db.String(20), unique=True, nullable=False)
    nama = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=True)
    password_hash = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), default='mahasiswa')
    fakultas = db.Column(db.String(50), nullable=True)

    def set_password(self, pwd):
        self.password_hash = generate_password_hash(pwd)

    def check_password(self, pwd):
        return check_password_hash(self.password_hash, pwd)

class Ticket(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    judul = db.Column(db.String(150), nullable=False)
    kategori = db.Column(db.String(50), nullable=False)
    prioritas = db.Column(db.String(20), default='Sedang')
    lokasi = db.Column(db.String(100), nullable=False)
    deskripsi = db.Column(db.Text, nullable=False)
    foto = db.Column(db.String(200), nullable=True)
    status = db.Column(db.String(20), default='Menunggu Persetujuan')
    support_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Relasi
    user = db.relationship('User', backref='tickets')

# Buat Tabel Otomatis
with app.app_context():
    db.create_all()

# ================= FUNGSI HELPER =================

def send_notification_email(user_email, ticket_id, status, judul):
    """Mengirim email notifikasi ke mahasiswa"""
    try:
        msg = Message(
            subject=f'Update Status Laporan #{ticket_id} - Suara Kampus ITG',
            recipients=[user_email]
        )
        msg.body = f"""
Halo,

Laporan Anda dengan judul "{judul}" telah diperbarui.

Status Terbaru: {status}

Silakan login ke sistem Suara Kampus untuk melihat detail dan mengunduh laporan PDF.

Terima kasih,
Admin Suara Kampus ITG
"""
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Error Email: {e}")
        return False

def generate_pdf(ticket):
    """Generate file PDF Laporan"""
    pdf = FPDF()
    pdf.add_page()
    
    # Header
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(200, 10, "LAPORAN PENGADUAN - SUARA KAMPUS ITG", ln=True, align='C')
    pdf.set_font("Arial", '', 10)
    pdf.cell(200, 5, "Institut Teknologi Garut", ln=True, align='C')
    pdf.ln(10)
    
    # Info
    pdf.set_font("Arial", 'B', 12)
    pdf.cell(40, 10, "Nomor Laporan:")
    pdf.set_font("Arial", '', 12)
    pdf.cell(100, 10, f"#{ticket.id}", ln=True)
    
    pdf.set_font("Arial", 'B', 12)
    pdf.cell(40, 10, "Tanggal:")
    pdf.set_font("Arial", '', 12)
    pdf.cell(100, 10, ticket.created_at.strftime('%d/%m/%Y %H:%M'), ln=True)
    
    pdf.set_font("Arial", 'B', 12)
    pdf.cell(40, 10, "Status:")
    pdf.set_font("Arial", '', 12)
    pdf.cell(100, 10, ticket.status, ln=True)
    
    pdf.ln(5)
    
    # Detail
    pdf.set_font("Arial", 'B', 12)
    pdf.cell(200, 10, "DETAIL LAPORAN", ln=True)
    pdf.set_font("Arial", '', 11)
    pdf.multi_cell(0, 8, f"Judul: {ticket.judul}")
    pdf.multi_cell(0, 8, f"Lokasi: {ticket.lokasi}")
    pdf.multi_cell(0, 8, f"Prioritas: {ticket.prioritas}")
    pdf.multi_cell(0, 8, f"Deskripsi: {ticket.deskripsi}")
    
    pdf.ln(10)
    
    # Footer
    pdf.set_y(-30)
    pdf.set_font("Arial", 'I', 8)
    pdf.cell(0, 10, "Dokumen ini digenerate otomatis oleh Sistem Suara Kampus ITG", ln=True, align='C')
    
    return pdf

# ================= ROUTES =================

# 1. BERANDA (PUBLIC - Siapa saja bisa lihat)
@app.route('/')
def index():
    return render_template('index.html')

# 2. LOGIN (Halaman Login)
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        nim = request.form['nim']
        pwd = request.form['password']
        user = User.query.filter_by(nim=nim).first()

        if user and user.check_password(pwd):
            session.update({
                'user_id': user.id,
                'role': user.role,
                'nama': user.nama,
                'nim': user.nim
            })
            flash('Selamat datang!', 'success')
            # Setelah login, baru diarahkan ke Dashboard
            return redirect(url_for('dashboard'))
        flash('NIM/NIP atau password salah!', 'danger')
    return render_template('login.html')

# 3. REGISTER (Halaman Daftar)
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        nim = request.form['nim']
        nama = request.form['nama']
        email = request.form['email']
        pwd = request.form['password']
        role = 'mahasiswa'
        fakultas = 'Umum'

        if User.query.filter_by(nim=nim).first():
            flash('NIM/NIP sudah terdaftar!', 'danger')
            return redirect(url_for('register'))

        user = User(nim=nim, nama=nama, email=email, role=role, fakultas=fakultas)
        user.set_password(pwd)
        db.session.add(user)
        db.session.commit()
        flash('Registrasi berhasil! Silakan login.', 'success')
        return redirect(url_for('login'))
    return render_template('register.html')

# 4. LOGOUT
@app.route('/logout')
def logout():
    session.clear()
    flash('Berhasil logout.', 'info')
    return redirect(url_for('index'))

# 5. DASHBOARD (PRIVATE - Wajib Login)
@app.route('/dashboard')
def dashboard():
    # Cek login di sini. Jika belum login, tendang ke halaman login.
    if 'user_id' not in session:
        return redirect(url_for('login'))

    if session['role'] in ['admin', 'staff']:
        tickets = Ticket.query.filter(Ticket.kategori != 'Aspirasi & Saran').order_by(Ticket.created_at.desc()).all()
    else:
        tickets = Ticket.query.filter(
            (Ticket.user_id == session['user_id']) & (Ticket.kategori != 'Aspirasi & Saran')
        ).order_by(Ticket.created_at.desc()).all()

    return render_template('keluhan.html', tickets=tickets)

# 6. DOWNLOAD PDF
@app.route('/download_pdf/<int:ticket_id>')
def download_pdf(ticket_id):
    ticket = Ticket.query.get_or_404(ticket_id)
    
    if session['role'] not in ['admin', 'staff'] and ticket.user_id != session['user_id']:
        flash('Akses ditolak!', 'danger')
        return redirect(url_for('dashboard'))
    
    pdf = generate_pdf(ticket)
    pdf_output = io.BytesIO(pdf.output(dest='S').encode('latin-1'))
    pdf_output.seek(0)
    
    return send_file(
        pdf_output,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f'Laporan_ITG_{ticket.id}.pdf'
    )

# 7. BUAT PENGADUAN
@app.route('/buat_pengaduan', methods=['GET', 'POST'])
def buat_pengaduan():
    if 'user_id' not in session:
        return redirect(url_for('login'))

    if request.method == 'POST':
        judul = request.form['judul']
        kategori = request.form['kategori']
        prioritas = request.form['prioritas']
        lokasi = request.form['lokasi']
        deskripsi = request.form['deskripsi']

        foto_filename = None
        if 'foto' in request.files:
            file = request.files['foto']
            if file and file.filename != '' and allowed_file(file.filename):
                foto_filename = secure_filename(file.filename)
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], foto_filename))

        ticket = Ticket(
            judul=judul,
            kategori=kategori,
            prioritas=prioritas,
            lokasi=lokasi,
            deskripsi=deskripsi,
            foto=foto_filename,
            user_id=session['user_id'],
            status='Menunggu Persetujuan'
        )
        db.session.add(ticket)
        db.session.commit()
        
        flash('Laporan berhasil dikirim! Menunggu persetujuan admin.', 'success')
        return redirect(url_for('dashboard'))
        
    return render_template('buat_pengaduan.html')

# 8. UPDATE STATUS (Admin Only)
@app.route('/update_status/<int:ticket_id>', methods=['POST'])
def update_status(ticket_id):
    if session.get('role') not in ['admin', 'staff']:
        flash('Akses ditolak!', 'danger')
        return redirect(url_for('dashboard'))
    
    status_baru = request.form.get('status')
    ticket = Ticket.query.get_or_404(ticket_id)
    old_status = ticket.status
    
    ticket.status = status_baru
    db.session.commit()
    
    # Kirim email jika status berubah ke Selesai
    if status_baru == 'Selesai' and old_status != 'Selesai':
        user = User.query.get(ticket.user_id)
        if user and user.email:
            send_notification_email(user.email, ticket.id, status_baru, ticket.judul)
            flash('Status diubah ke Selesai & Email notifikasi terkirim.', 'success')
        else:
            flash('Status diubah ke Selesai. (Email tidak terkirim)', 'warning')
    else:
        flash('Status berhasil diperbarui.', 'success')
    
    return redirect(url_for('dashboard'))

# 9. SUPPORT ASPIRASI
@app.route('/support/<int:ticket_id>')
def support_aspirasi(ticket_id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    ticket = Ticket.query.get_or_404(ticket_id)
    ticket.support_count += 1
    db.session.commit()
    return redirect(url_for('riwayat_aspirasi'))

# 10. ASPIRASI
@app.route('/aspirasi', methods=['GET', 'POST'])
def aspirasi():
    if 'user_id' not in session:
        return redirect(url_for('login'))

    if request.method == 'POST':
        judul = request.form['judul']
        isi = request.form['isi']
        ticket = Ticket(
            judul=judul,
            kategori='Aspirasi & Saran',
            prioritas='Sedang',
            lokasi='Online',
            deskripsi=isi,
            user_id=session['user_id']
        )
        db.session.add(ticket)
        db.session.commit()
        flash('Aspirasi berhasil dikirim!', 'success')
        return redirect(url_for('riwayat_aspirasi'))
    return render_template('aspirasi.html')

# 11. RIWAYAT ASPIRASI
@app.route('/riwayat_aspirasi')
def riwayat_aspirasi():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    tickets = Ticket.query.filter_by(kategori='Aspirasi & Saran').order_by(Ticket.support_count.desc()).all()
    return render_template('riwayat_aspirasi.html', tickets=tickets)
# Tambahkan di bawah route 'riwayat_aspirasi'

@app.route('/stats')
def stats():
    if 'user_id' not in session:
        return redirect(url_for('login'))

    # Hitung Total Laporan
    total_keluhan = Ticket.query.filter(Ticket.kategori != 'Aspirasi & Saran').count()
    total_aspirasi = Ticket.query.filter_by(kategori='Aspirasi & Saran').count()
    
    # Hitung yang Selesai
    selesai = Ticket.query.filter_by(status='Selesai').count()
    
    # Persentase Penyelesaian
    persen = 0
    if total_keluhan > 0:
        persen = int((selesai / total_keluhan) * 100)

    return render_template('stats.html', 
                           total_keluhan=total_keluhan, 
                           total_aspirasi=total_aspirasi, 
                           selesai=selesai, 
                           persen=persen)
@app.route('/faq')
def faq():
    return render_template('faq.html')
if __name__ == '__main__':
    debug_mode = os.getenv('FLASK_DEBUG', '0') == '1'
    host = os.getenv('HOST', '0.0.0.0')
    port = int(os.getenv('PORT', 5000))
    app.run(debug=debug_mode, host=host, port=port)
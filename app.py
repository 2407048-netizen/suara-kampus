import os
import io
import re
import uuid
import tempfile
from flask import Flask, render_template, request, redirect, url_for, session, flash, send_file
from flask_socketio import SocketIO
import pdfkit
import bleach
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_wtf import FlaskForm
from flask_wtf.csrf import CSRFProtect
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
from fpdf import FPDF
from flask_mail import Mail, Message
from functools import wraps

# ================= KONFIGURASI APLIKASI =================
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'suara_kampus_itgarut_2026_!@#$%')
csrf = CSRFProtect(app)
socketio = SocketIO(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///suara_kampus.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = tempfile.mkdtemp()  # Menggunakan direktori sementara yang diizinkan Vercel
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # Max 5MB

# ================= KONFIGURASI SESSION =================
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=8)   # Session expires 8 jam
app.config['SESSION_COOKIE_HTTPONLY'] = True                     # Cegah akses JS ke cookie
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'                   # Cegah CSRF dasar

# ================= KONFIGURASI EMAIL =================
app.config['MAIL_SERVER']         = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT']           = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS']        = True
app.config['MAIL_USERNAME']       = os.getenv('MAIL_USERNAME', '2407048@itg.ac.id')
app.config['MAIL_PASSWORD']       = os.getenv('MAIL_PASSWORD', 'lrbaifglubtlxevl')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', 'Suara Kampus ITG <2407048@itg.ac.id>')

mail = Mail(app)

# Inisialisasi Database
# os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)  # Di-comment untuk menghindari error Read-Only di Vercel
db = SQLAlchemy(app)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ================= DATABASE MODELS =================
class User(db.Model):
    id              = db.Column(db.Integer, primary_key=True)
    nim             = db.Column(db.String(20), unique=True, nullable=False)
    nama            = db.Column(db.String(100), nullable=False)
    email           = db.Column(db.String(120), nullable=True)
    password_hash   = db.Column(db.String(200), nullable=False)
    role            = db.Column(db.String(20), default='mahasiswa')   # mahasiswa | admin | staff
    fakultas        = db.Column(db.String(50), nullable=True)
    # --- Kolom baru untuk auth yang lebih aman ---
    is_active       = db.Column(db.Boolean, default=True, nullable=False)   # False = akun diblokir
    login_attempts  = db.Column(db.Integer, default=0, nullable=False)      # Counter gagal login
    locked_until    = db.Column(db.DateTime, nullable=True)                 # Waktu unlock akun
    last_login      = db.Column(db.DateTime, nullable=True)                 # Waktu login terakhir
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)       # Waktu registrasi

    def set_password(self, pwd):
        """Hash password menggunakan pbkdf2:sha256"""
        self.password_hash = generate_password_hash(pwd, method='pbkdf2:sha256', salt_length=16)

    def check_password(self, pwd):
        """Verifikasi password"""
        return check_password_hash(self.password_hash, pwd)

    def is_locked(self):
        """Cek apakah akun sedang terkunci karena terlalu banyak percobaan login gagal"""
        if self.locked_until and datetime.utcnow() < self.locked_until:
            return True
        return False

    def remaining_lock_minutes(self):
        """Sisa waktu terkunci dalam menit"""
        if self.locked_until:
            remaining = (self.locked_until - datetime.utcnow()).total_seconds()
            return max(0, int(remaining // 60))
        return 0

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

class LaporanDosen(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    nama_dosen = db.Column(db.String(150), nullable=False)
    mata_kuliah = db.Column(db.String(100), nullable=False)
    kelas = db.Column(db.String(50), nullable=False)
    semester = db.Column(db.String(20), nullable=False)
    judul = db.Column(db.String(150), nullable=False)
    kronologi = db.Column(db.Text, nullable=False)
    dampak_pembelajaran = db.Column(db.Text, nullable=False)
    bukti_path = db.Column(db.String(200), nullable=True)
    status = db.Column(db.String(20), default='Diajukan')
    tanggapan_admin = db.Column(db.Text, nullable=True)
    is_archived = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relasi
    user = db.relationship('User', backref='laporan_dosen')
    audit_logs = db.relationship('AuditLog', backref='laporan', cascade="all, delete-orphan", lazy=True)

class AuditLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    laporan_dosen_id = db.Column(db.Integer, db.ForeignKey('laporan_dosen.id'), nullable=False)
    admin_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    status_lama = db.Column(db.String(20), nullable=True)
    status_baru = db.Column(db.String(20), nullable=False)
    catatan = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relasi
    admin = db.relationship('User', backref='audit_logs_dibuat', foreign_keys=[admin_id])

# Buat Tabel & Migrasi Kolom Otomatis
with app.app_context():
    db.create_all()

    # --- Migrasi: tambah kolom baru jika database lama belum punya ---
    import sqlite3 as _sqlite3
    _db_path = os.path.join('instance', 'suara_kampus.db')
    _conn = _sqlite3.connect(_db_path)
    _cur  = _conn.cursor()
    _existing_cols = {row[1] for row in _cur.execute("PRAGMA table_info('user')")}

    _migrations = [
        ("is_active",      "ALTER TABLE user ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1"),
        ("login_attempts", "ALTER TABLE user ADD COLUMN login_attempts INTEGER NOT NULL DEFAULT 0"),
        ("locked_until",   "ALTER TABLE user ADD COLUMN locked_until DATETIME"),
        ("last_login",     "ALTER TABLE user ADD COLUMN last_login DATETIME"),
        ("created_at",     "ALTER TABLE user ADD COLUMN created_at DATETIME"),
    ]
    for col_name, sql in _migrations:
        if col_name not in _existing_cols:
            _cur.execute(sql)
            print(f"[DB Migration] Kolom '{col_name}' ditambahkan.")

    _conn.commit()
    _conn.close()

    # Pastikan akun admin default selalu tersedia
    if not User.query.filter_by(nim='ADMIN001').first():
        admin = User(
            nim='ADMIN001',
            nama='Administrator Kampus',
            email='admin@itg.ac.id',
            role='admin',
            fakultas='IT',
            is_active=True
        )
        admin.set_password('admin123')   # Gunakan set_password agar konsisten
        db.session.add(admin)
        db.session.commit()

# ================= FUNGSI HELPER AUTH =================

# Format NIM mahasiswa ITG: 10 digit angka (contoh: 2024103001)
NIM_PATTERN = re.compile(r'^\d{7,12}$')
MAX_LOGIN_ATTEMPTS = 5      # Maksimal percobaan login sebelum terkunci
LOCKOUT_MINUTES    = 15     # Durasi penguncian akun (menit)

def validate_nim_format(nim):
    """
    Validasi format NIM mahasiswa ITG.
    Rules:
      - Hanya angka, panjang 9-12 digit
      - Bukan NIM admin (ADMIN*)
    """
    if nim.upper().startswith('ADMIN'):
        return False, 'NIM tidak valid untuk registrasi mahasiswa.'
    if not NIM_PATTERN.match(nim):
        return False, 'NIM harus berupa angka 7-12 digit (contoh: 2407048).'
    return True, ''

def validate_password_strength(password):
    """
    Validasi kekuatan password.
    Rules:
      - Minimal 8 karakter
      - Minimal 1 huruf
      - Minimal 1 angka
    """
    if len(password) < 8:
        return False, 'Password minimal 8 karakter.'
    if not re.search(r'[A-Za-z]', password):
        return False, 'Password harus mengandung minimal 1 huruf.'
    if not re.search(r'\d', password):
        return False, 'Password harus mengandung minimal 1 angka.'
    return True, ''

def generate_itg_email(nim):
    """Generate email kampus otomatis dari NIM: {nim}@itg.ac.id"""
    return f"{nim.lower()}@itg.ac.id"

# ================= FUNGSI HELPER LAINNYA =================
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg'}

def allowed_image(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS

def send_welcome_email(nama, nim, email):
    """Kirim email sambutan ke mahasiswa yang baru registrasi"""
    try:
        msg = Message(
            subject='Selamat Datang di Suara Kampus ITG!',
            recipients=[email]
        )
        msg.html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
            <div style="background: #003366; padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Suara Kampus ITG</h1>
                <p style="color: #aad4f5; margin: 5px 0 0;">Institut Teknologi Garut</p>
            </div>
            <div style="padding: 30px;">
                <h2 style="color: #003366;">Halo, {nama}! 👋</h2>
                <p style="color: #555;">Selamat! Akun Anda berhasil didaftarkan di <strong>Sistem Suara Kampus ITG</strong>.</p>

                <div style="background: #f0f6ff; border-left: 4px solid #003366; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>📋 Detail Akun:</strong></p>
                    <p style="margin: 5px 0;">NIM &nbsp;&nbsp;: <strong>{nim}</strong></p>
                    <p style="margin: 5px 0;">Email : <strong>{email}</strong></p>
                </div>

                <p style="color: #555;">Dengan akun ini, Anda dapat:</p>
                <ul style="color: #555;">
                    <li>📝 Melaporkan keluhan fasilitas kampus</li>
                    <li>💡 Menyampaikan aspirasi dan saran</li>
                    <li>📊 Memantau status laporan secara real-time</li>
                    <li>📄 Mengunduh bukti laporan dalam format PDF</li>
                </ul>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="http://127.0.0.1:5000/login"
                       style="background: #003366; color: white; padding: 12px 30px;
                              border-radius: 6px; text-decoration: none; font-weight: bold;">
                        Login Sekarang
                    </a>
                </div>

                <p style="color: #888; font-size: 13px;">
                    Jika Anda tidak merasa mendaftar, abaikan email ini.
                </p>
            </div>
            <div style="background: #f8f9fa; padding: 15px; text-align: center; border-top: 1px solid #ddd;">
                <p style="color: #aaa; font-size: 12px; margin: 0;">
                    &copy; 2026 Suara Kampus | Institut Teknologi Garut
                </p>
            </div>
        </div>
        """
        mail.send(msg)
        print(f"[Email] Welcome email terkirim ke {email}")
        return True
    except Exception as e:
        print(f"[Email] Gagal kirim welcome email ke {email}: {e}")
        return False

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

# ================= AUTH DECORATORS =================
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Silakan login terlebih dahulu.', 'warning')
            return redirect(url_for('login'))
        # Cek apakah akun masih aktif (bisa diblokir admin sewaktu-waktu)
        user = db.session.get(User, session['user_id'])
        if user and not user.is_active:
            session.clear()
            flash('Akun Anda telah dinonaktifkan. Hubungi administrator.', 'danger')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def roles_required(*roles):
    def wrapper(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if session.get('role') not in roles:
                flash('Akses ditolak!', 'danger')
                return redirect(url_for('dashboard'))
            return f(*args, **kwargs)
        return decorated
    return wrapper

# ================= ROUTES =================

# 1. BERANDA (PUBLIC - Siapa saja bisa lihat)
@app.route('/')
def index():
    return render_template('index.html')

# 2. LOGIN (Halaman Login)
@app.route('/login', methods=['GET', 'POST'])
def login():
    # Redirect ke dashboard jika sudah login
    if 'user_id' in session:
        return redirect(url_for('dashboard'))

    if request.method == 'POST':
        nim = request.form.get('nim', '').strip()
        pwd = request.form.get('password', '')

        if not nim or not pwd:
            flash('NIM dan password tidak boleh kosong.', 'warning')
            return render_template('login.html')

        user = User.query.filter_by(nim=nim).first()

        # --- Cek akun ditemukan ---
        if not user:
            flash('NIM/NIP atau password salah!', 'danger')
            return render_template('login.html')

        # --- Cek akun aktif ---
        if not user.is_active:
            flash('Akun Anda telah dinonaktifkan. Hubungi administrator.', 'danger')
            return render_template('login.html')

        # --- Cek akun terkunci (brute-force protection) ---
        if user.is_locked():
            sisa = user.remaining_lock_minutes()
            flash(f'Akun terkunci sementara karena terlalu banyak percobaan login. '
                  f'Coba lagi dalam {sisa} menit.', 'danger')
            return render_template('login.html')

        # --- Verifikasi password ---
        if user.check_password(pwd):
            # Login berhasil: reset percobaan gagal, update last_login
            user.login_attempts = 0
            user.locked_until   = None
            user.last_login     = datetime.utcnow()
            db.session.commit()

            # Set session permanen (ikut PERMANENT_SESSION_LIFETIME)
            session.permanent = True
            session.update({
                'user_id': user.id,
                'role':    user.role,
                'nama':    user.nama,
                'nim':     user.nim
            })
            flash(f'Selamat datang, {user.nama}!', 'success')
            return redirect(url_for('dashboard'))
        else:
            # Login gagal: tambah counter
            user.login_attempts += 1
            if user.login_attempts >= MAX_LOGIN_ATTEMPTS:
                user.locked_until  = datetime.utcnow() + timedelta(minutes=LOCKOUT_MINUTES)
                user.login_attempts = 0   # Reset setelah dikunci
                db.session.commit()
                flash(f'Akun terkunci selama {LOCKOUT_MINUTES} menit karena '
                      f'{MAX_LOGIN_ATTEMPTS}x percobaan login gagal.', 'danger')
            else:
                sisa_coba = MAX_LOGIN_ATTEMPTS - user.login_attempts
                db.session.commit()
                flash(f'NIM/NIP atau password salah! '
                      f'Sisa percobaan: {sisa_coba}x sebelum akun dikunci.', 'danger')

    return render_template('login.html')

# 3. REGISTER (Halaman Daftar)
@app.route('/register', methods=['GET', 'POST'])
def register():
    # Redirect ke dashboard jika sudah login
    if 'user_id' in session:
        return redirect(url_for('dashboard'))

    if request.method == 'POST':
        nim     = request.form.get('nim', '').strip()
        nama    = request.form.get('nama', '').strip()
        pwd     = request.form.get('password', '')
        pwd2    = request.form.get('password2', '')

        # --- Validasi field tidak kosong ---
        if not nim or not nama or not pwd or not pwd2:
            flash('Semua kolom wajib diisi.', 'warning')
            return render_template('register.html', nim=nim, nama=nama)

        # --- Validasi format NIM ---
        valid_nim, msg_nim = validate_nim_format(nim)
        if not valid_nim:
            flash(msg_nim, 'danger')
            return render_template('register.html', nim=nim, nama=nama)

        # --- Validasi nama minimal 3 karakter ---
        if len(nama) < 3:
            flash('Nama lengkap minimal 3 karakter.', 'danger')
            return render_template('register.html', nim=nim, nama=nama)

        # --- Validasi kekuatan password ---
        valid_pwd, msg_pwd = validate_password_strength(pwd)
        if not valid_pwd:
            flash(msg_pwd, 'danger')
            return render_template('register.html', nim=nim, nama=nama)

        # --- Validasi konfirmasi password ---
        if pwd != pwd2:
            flash('Password dan konfirmasi password tidak cocok.', 'danger')
            return render_template('register.html', nim=nim, nama=nama)

        # --- Cek NIM sudah terdaftar ---
        if User.query.filter_by(nim=nim).first():
            flash('NIM sudah terdaftar! Silakan login atau gunakan NIM yang benar.', 'danger')
            return render_template('register.html', nama=nama)

        # --- Generate email otomatis dari NIM (server-side, tidak bisa di-bypass) ---
        email = generate_itg_email(nim)

        user = User(
            nim=nim,
            nama=nama,
            email=email,
            role='mahasiswa',
            fakultas='Umum',
            is_active=True
        )
        user.set_password(pwd)
        db.session.add(user)
        db.session.commit()

        # Kirim email sambutan (non-blocking: gagal kirim tidak batalkan registrasi)
        send_welcome_email(nama, nim, email)

        flash(f'Registrasi berhasil! Email sambutan telah dikirim ke {email}. Silakan login.', 'success')
        return redirect(url_for('login'))

    return render_template('register.html')

# 4. LOGOUT
@app.route('/logout')
def logout():
    nama = session.get('nama', 'Pengguna')
    session.clear()   # Hapus semua data session
    flash(f'Sampai jumpa, {nama}! Anda telah logout.', 'info')
    return redirect(url_for('index'))

# 5. DASHBOARD (PRIVATE - Wajib Login)
@app.route('/dashboard')
@login_required
def dashboard():
    # Base query untuk Keluhan berdasarkan role
    if session['role'] in ['admin', 'staff']:
        query_keluhan = Ticket.query.filter(Ticket.kategori != 'Aspirasi & Saran')
    else:
        query_keluhan = Ticket.query.filter(
            (Ticket.user_id == session['user_id']) & (Ticket.kategori != 'Aspirasi & Saran')
        )
    
    # 1. Statistik Keluhan
    total_laporan = query_keluhan.count()
    laporan_diproses = query_keluhan.filter_by(status='Diproses').count()
    laporan_selesai = query_keluhan.filter_by(status='Selesai').count()

    # 2. Statistik Aspirasi (Global)
    total_aspirasi = Ticket.query.filter_by(kategori='Aspirasi & Saran').count()
    total_like = db.session.query(func.sum(Ticket.support_count)).filter(Ticket.kategori == 'Aspirasi & Saran').scalar() or 0
    aspirasi_populer = Ticket.query.filter_by(kategori='Aspirasi & Saran').order_by(Ticket.support_count.desc()).first()

    # 3. Notifikasi Perkembangan (5 tiket terakhir diupdate)
    notifikasi = query_keluhan.order_by(Ticket.updated_at.desc()).limit(5).all()

    # 4. Daftar Keluhan lengkap untuk tabel (urutkan dari yang terbaru dibuat)
    tickets = query_keluhan.order_by(Ticket.created_at.desc()).all()

    return render_template('dashboard.html', 
                           total_laporan=total_laporan,
                           laporan_diproses=laporan_diproses,
                           laporan_selesai=laporan_selesai,
                           total_aspirasi=total_aspirasi,
                           total_like=total_like,
                           aspirasi_populer=aspirasi_populer,
                           notifikasi=notifikasi,
                           tickets=tickets)

# 6. DOWNLOAD PDF
@app.route('/download_pdf/<int:ticket_id>')
@login_required
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

# 7. BUAT LAPORAN
@app.route('/buat_laporan', methods=['GET', 'POST'])
@login_required
def buat_laporan():
    if request.method == 'POST':
        judul = request.form.get('judul', '').strip()
        kategori = request.form.get('kategori', '')
        deskripsi = request.form.get('deskripsi', '').strip()

        # Validasi kosong
        if not judul or not deskripsi:
            flash('Judul dan Deskripsi tidak boleh kosong.', 'danger')
            return render_template('buat_laporan.html', judul=judul, deskripsi=deskripsi, kategori=kategori)
        
        # Validasi Kategori
        valid_kategori = ['Fasilitas Kelas', 'Fasilitas Lab', 'Fasilitas Kampus', 'Himpunan Mahasiswa', 'Layanan TUK', 'Layanan PRODI', 'Layanan Kampus']
        if kategori not in valid_kategori:
            flash('Pilih kategori yang valid.', 'danger')
            return render_template('buat_laporan.html', judul=judul, deskripsi=deskripsi)

        # Anti Duplicate Dasar (Judul persis sama dari user manapun)
        if Ticket.query.filter_by(judul=judul).first():
            flash('Laporan dengan judul tersebut sudah pernah dibuat. Silakan gunakan judul lain.', 'danger')
            return render_template('buat_laporan.html', deskripsi=deskripsi, kategori=kategori)

        # Validasi File & UUID
        foto_filename = None
        if 'foto' in request.files:
            file = request.files['foto']
            if file and file.filename != '':
                if not allowed_image(file.filename):
                    flash('Format file tidak didukung. Hanya JPG dan PNG yang diizinkan.', 'danger')
                    return render_template('buat_laporan.html', judul=judul, deskripsi=deskripsi, kategori=kategori)
                
                # Gunakan uuid untuk nama file
                ext = file.filename.rsplit('.', 1)[1].lower()
                foto_filename = f"{uuid.uuid4().hex}.{ext}"
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], foto_filename))

        # Gunakan model Ticket sesuai Opsi 2 (Ticket act as Laporan)
        ticket = Ticket(
            judul=judul,
            kategori=kategori,
            prioritas='Sedang', # Default karena form baru tidak pakai prioritas
            lokasi='Tidak dispesifikasikan', # Default karena form baru tidak ada lokasi
            deskripsi=deskripsi,
            foto=foto_filename,
            user_id=session['user_id'],
            status='Diajukan'
        )
        db.session.add(ticket)
        db.session.commit()
        
        flash('Laporan berhasil dikirim! Menunggu persetujuan admin.', 'success')
        return redirect(url_for('dashboard'))
        
    return render_template('buat_laporan.html')

# 8. UPDATE STATUS (Admin Only)
@app.route('/update_status/<int:ticket_id>', methods=['POST'])
@login_required
@roles_required('admin', 'staff')
def update_status(ticket_id):
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
@login_required
def support_aspirasi(ticket_id):
    ticket = Ticket.query.get_or_404(ticket_id)
    ticket.support_count += 1
    db.session.commit()
    return redirect(url_for('riwayat_aspirasi'))

# 10. ASPIRASI
@app.route('/aspirasi', methods=['GET', 'POST'])
@login_required
def aspirasi():
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
@login_required
def riwayat_aspirasi():
    tickets = Ticket.query.filter_by(kategori='Aspirasi & Saran').order_by(Ticket.support_count.desc()).all()
    return render_template('riwayat_aspirasi.html', tickets=tickets)
# Tambahkan di bawah route 'riwayat_aspirasi'

@app.route('/stats')
@login_required
def stats():
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
    return render_template('paq.html')

# ================= LAPORAN KINERJA DOSEN =================

@app.route('/buat_laporan_dosen', methods=['GET', 'POST'])
@login_required
def buat_laporan_dosen():
    if request.method == 'POST':
        nama_dosen = request.form.get('nama_dosen', '').strip()
        mata_kuliah = request.form.get('mata_kuliah', '').strip()
        kelas = request.form.get('kelas', '').strip()
        semester = request.form.get('semester', '').strip()
        judul = request.form.get('judul', '').strip()
        kronologi = request.form.get('kronologi', '').strip()
        dampak = request.form.get('dampak_pembelajaran', '').strip()

        if not all([nama_dosen, mata_kuliah, kelas, semester, judul, kronologi, dampak]):
            flash('Semua field wajib diisi!', 'danger')
            return render_template('buat_laporan_dosen.html')

        foto_filename = None
        if 'foto' in request.files:
            file = request.files['foto']
            if file and file.filename != '':
                if not allowed_image(file.filename):
                    flash('Format file tidak didukung. Hanya JPG dan PNG yang diizinkan.', 'danger')
                    return render_template('buat_laporan_dosen.html')
                
                ext = file.filename.rsplit('.', 1)[1].lower()
                foto_filename = f"dosen_{uuid.uuid4().hex}.{ext}"
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], foto_filename))

        laporan = LaporanDosen(
            user_id=session['user_id'],
            nama_dosen=nama_dosen,
            mata_kuliah=mata_kuliah,
            kelas=kelas,
            semester=semester,
            judul=judul,
            kronologi=kronologi,
            dampak_pembelajaran=dampak,
            bukti_path=foto_filename,
            status='Diajukan'
        )
        db.session.add(laporan)
        db.session.commit()
        
        flash('Laporan Kinerja Dosen berhasil dikirim secara rahasia.', 'success')
        return redirect(url_for('dashboard'))
        
    return render_template('buat_laporan_dosen.html')

@app.route('/admin/laporan_dosen')
@login_required
@roles_required('admin')
def admin_laporan_dosen():
    laporan = LaporanDosen.query.order_by(LaporanDosen.created_at.desc()).all()
    return render_template('admin_laporan_dosen.html', laporan=laporan)

@app.route('/admin/laporan_dosen/<int:id>', methods=['GET', 'POST'])
@login_required
@roles_required('admin')
def admin_laporan_dosen_detail(id):
    laporan = LaporanDosen.query.get_or_404(id)
    
    if request.method == 'POST':
        status_baru = request.form.get('status')
        tanggapan = request.form.get('tanggapan', '').strip()
        is_archived = request.form.get('is_archived') == 'on'
        
        status_lama = laporan.status
        laporan.status = status_baru
        laporan.tanggapan_admin = tanggapan
        laporan.is_archived = is_archived
        
        if status_baru != status_lama:
            audit = AuditLog(
                laporan_dosen_id=laporan.id,
                admin_id=session['user_id'],
                status_lama=status_lama,
                status_baru=status_baru,
                catatan=tanggapan
            )
            db.session.add(audit)
            
        db.session.commit()
        flash('Laporan Kinerja Dosen berhasil diupdate.', 'success')
        return redirect(url_for('admin_laporan_dosen_detail', id=id))
        
    return render_template('admin_laporan_dosen_detail.html', laporan=laporan)

# 12. CHAT
@app.route('/chat/<int:ticket_id>')
@login_required
def chat(ticket_id):
    # Verify user has access to this ticket (e.g., is admin or owner)
    ticket = Ticket.query.get_or_404(ticket_id)
    if session['role'] not in ['admin', 'staff'] and ticket.user_id != session['user_id']:
        flash('Akses ditolak!', 'danger')
        return redirect(url_for('dashboard'))
    return render_template('chat.html', ticket_id=ticket_id)

from flask_socketio import join_room

@socketio.on('handle_join')
def on_join(data):
    room = data['ticket_id']
    join_room(room)

@socketio.on('handle_message')
def on_message(data):
    room = data['ticket_id']
    socketio.emit('new_message', data, room=room)

if __name__ == '__main__':
    socketio.run(app, debug=True)
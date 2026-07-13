import os
import io
import csv
import pdfkit
import bleach

from flask import Flask, render_template, render_template_string, request, redirect, url_for, session, flash, send_file, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO, emit, join_room
from flask_wtf.csrf import CSRFProtect, generate_csrf
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import or_, text
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
from fpdf import FPDF
from flask_mail import Mail, Message
from functools import wraps

# ================= KONFIGURASI APLIKASI =================
app = Flask(__name__, instance_path='/tmp/instance', instance_relative_config=False)
app.config['SECRET_KEY'] = 'suara_kampus_itgarut_2026'
app.config['WTF_CSRF_ENABLED'] = True
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///suara_kampus.db'
socketio = SocketIO(app, cors_allowed_origins="*")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = '/tmp/uploads'
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # Max 5MB
csrf = CSRFProtect(app)
limiter = Limiter(get_remote_address, app=app, default_limits=["200 per day", "50 per hour"])

@app.context_processor
def inject_csrf_token():
    return {'csrf_token': generate_csrf()}

try:
    config = pdfkit.configuration(wkhtmltopdf='C:/Program Files/wkhtmltopdf/bin/wkhtmltopdf.exe')
except Exception:
    config = None

# ================= KONFIGURASI EMAIL (GMAIL - TESTING) =================
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True').lower() in ('true', '1', 'yes')
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME', 'email_anda@gmail.com')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD', 'app_password_16_digit')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', 'Suara Kampus ITG <email_anda@gmail.com>')

mail = Mail(app)

# Inisialisasi Database
# Upload folder di /tmp (Vercel writable)
except OSError:
    pass
db = SQLAlchemy(app)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf'}
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def sanitize_input(text):
    if text is None:
        return ''
    return bleach.clean(str(text), strip=True)

def validate_email_itg(email):
    """Validasi email harus domain @itg.ac.id (FR-01)"""
    return email and email.strip().lower().endswith('@itg.ac.id')

def log_activity(user_id, action, details):
    if not user_id:
        return None
    activity = ActivityLog(user_id=user_id, action=action, details=str(details)[:500])
    db.session.add(activity)
    db.session.commit()
    return activity

# ================= DATABASE MODELS =================
class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    nim = db.Column(db.String(20), unique=True, nullable=False)
    nama = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=True)
    password_hash = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), default='mahasiswa')
    fakultas = db.Column(db.String(50), nullable=True)
    status_aktif = db.Column(db.String(20), default='aktif')
    is_deleted = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    reports = db.relationship('Ticket', backref='user', lazy=True, foreign_keys='Ticket.user_id')
    lecturer_reports = db.relationship('LecturerReport', backref='user', lazy=True)
    aspirations = db.relationship('Aspirasi', backref='user', lazy=True)
    comments = db.relationship('Comment', backref='user', lazy=True)
    notifications = db.relationship('Notification', backref='user', lazy=True)
    activity_logs = db.relationship('ActivityLog', backref='user', lazy=True)

    def set_password(self, pwd):
        self.password_hash = generate_password_hash(pwd)

    def check_password(self, pwd):
        return check_password_hash(self.password_hash, pwd)

class Category(db.Model):
    __tablename__ = 'categories'

    id = db.Column(db.Integer, primary_key=True)
    nama = db.Column(db.String(100), nullable=False)
    deskripsi = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    reports = db.relationship('Ticket', backref='category', lazy=True)

class Aspirasi(db.Model):
    __tablename__ = 'aspirations'

    id = db.Column(db.Integer, primary_key=True)
    judul = db.Column(db.String(150), nullable=False)
    isi = db.Column(db.Text, nullable=False)
    is_anonymous = db.Column(db.Boolean, default=False)
    is_anonim = db.synonym('is_anonymous')
    like_count = db.Column(db.Integer, default=0)
    dislike_count = db.Column(db.Integer, default=0)
    is_deleted = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

class AspirasiReaction(db.Model):
    __tablename__ = 'aspiration_reactions'

    id = db.Column(db.Integer, primary_key=True)
    aspirasi_id = db.Column(db.Integer, db.ForeignKey('aspirations.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    tipe = db.Column(db.String(10), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    aspirasi = db.relationship('Aspirasi', backref='reactions')
    user = db.relationship('User', backref='aspirasi_reactions')

    __table_args__ = (
        db.UniqueConstraint('aspirasi_id', 'user_id', name='uq_aspirasi_user_reaction'),
    )

class ChatMessage(db.Model):
    __tablename__ = 'chats'

    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, nullable=False)
    sender_id = db.Column(db.Integer, nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    timestamp = db.synonym('created_at')

class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message = db.Column(db.String(255), nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    link = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    timestamp = db.synonym('created_at')

class Ticket(db.Model):
    __tablename__ = 'reports'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    kategori_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=True)
    judul = db.Column(db.String(150), nullable=False)
    kategori = db.Column(db.String(50), nullable=False)
    prioritas = db.Column(db.String(20), default='Sedang')
    lokasi = db.Column(db.String(100), nullable=False)
    deskripsi = db.Column(db.Text, nullable=False)
    foto = db.Column(db.String(200), nullable=True)
    bukti_path = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(20), default='Menunggu Persetujuan')
    tanggapan_admin = db.Column(db.Text, nullable=True)
    support_count = db.Column(db.Integer, default=0)
    admin_response = db.Column(db.Text, nullable=True)
    proof_file = db.Column(db.String(200), nullable=True)
    is_deleted = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class LecturerReport(db.Model):
    __tablename__ = 'lecturer_reports'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    nama_dosen = db.Column(db.String(100), nullable=False)
    mata_kuliah = db.Column(db.String(100), nullable=False)
    kelas = db.Column(db.String(50), nullable=True)
    semester = db.Column(db.String(20), nullable=True)
    judul = db.Column(db.String(150), nullable=False)
    kronologi = db.Column(db.Text, nullable=False)
    dampak = db.Column(db.Text, nullable=True)
    bukti_path = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(20), default='Diajukan')
    tanggapan_admin = db.Column(db.Text, nullable=True)
    is_archived = db.Column(db.Boolean, default=False)
    is_deleted = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Comment(db.Model):
    __tablename__ = 'comments'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    ticket_id = db.Column(db.Integer, db.ForeignKey('reports.id'), nullable=False)
    isi = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class PdfReport(db.Model):
    __tablename__ = 'pdf_reports'

    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.Integer, db.ForeignKey('reports.id'), nullable=False)
    file_path = db.Column(db.String(255), nullable=False)
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)

class ActivityLog(db.Model):
    __tablename__ = 'activity_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    action = db.Column(db.String(100), nullable=False)
    details = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Buat Tabel Otomatis
with app.app_context():
    db.create_all()

    # Auto-migrate kolom baru jika belum ada
    try:
        inspector = db.inspect(db.engine)
        with db.engine.begin() as conn:
            # Users table
            user_columns = {col['name'] for col in inspector.get_columns('users')}
            if 'status_aktif' not in user_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN status_aktif VARCHAR(20) DEFAULT 'aktif'"))
            if 'is_deleted' not in user_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_deleted BOOLEAN DEFAULT 0"))
            if 'created_at' not in user_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN created_at DATETIME"))
            if 'updated_at' not in user_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN updated_at DATETIME"))

            # Reports table
            report_columns = {col['name'] for col in inspector.get_columns('reports')}
            if 'kategori_id' not in report_columns:
                conn.execute(text("ALTER TABLE reports ADD COLUMN kategori_id INTEGER"))
            if 'bukti_path' not in report_columns:
                conn.execute(text("ALTER TABLE reports ADD COLUMN bukti_path VARCHAR(255)"))
            if 'tanggapan_admin' not in report_columns:
                conn.execute(text("ALTER TABLE reports ADD COLUMN tanggapan_admin TEXT"))
            if 'is_deleted' not in report_columns:
                conn.execute(text("ALTER TABLE reports ADD COLUMN is_deleted BOOLEAN DEFAULT 0"))
            if 'updated_at' not in report_columns:
                conn.execute(text("ALTER TABLE reports ADD COLUMN updated_at DATETIME"))

            # Aspirations table
            aspiration_columns = {col['name'] for col in inspector.get_columns('aspirations')}
            if 'is_anonymous' not in aspiration_columns:
                conn.execute(text("ALTER TABLE aspirations ADD COLUMN is_anonymous BOOLEAN DEFAULT 0"))
            if 'is_deleted' not in aspiration_columns:
                conn.execute(text("ALTER TABLE aspirations ADD COLUMN is_deleted BOOLEAN DEFAULT 0"))
            if 'updated_at' not in aspiration_columns:
                conn.execute(text("ALTER TABLE aspirations ADD COLUMN updated_at DATETIME"))

            # Notifications table
            notification_columns = {col['name'] for col in inspector.get_columns('notifications')}
            if 'link' not in notification_columns:
                conn.execute(text("ALTER TABLE notifications ADD COLUMN link VARCHAR(255)"))
            if 'created_at' not in notification_columns:
                conn.execute(text("ALTER TABLE notifications ADD COLUMN created_at DATETIME"))

            # Chats table
            chat_columns = {col['name'] for col in inspector.get_columns('chats')}
            if 'is_read' not in chat_columns:
                conn.execute(text("ALTER TABLE chats ADD COLUMN is_read BOOLEAN DEFAULT 0"))
            if 'created_at' not in chat_columns:
                conn.execute(text("ALTER TABLE chats ADD COLUMN created_at DATETIME"))

            # Lecturer reports table
            lecturer_columns = {col['name'] for col in inspector.get_columns('lecturer_reports')}
            if 'is_archived' not in lecturer_columns:
                conn.execute(text("ALTER TABLE lecturer_reports ADD COLUMN is_archived BOOLEAN DEFAULT 0"))
            if 'is_deleted' not in lecturer_columns:
                conn.execute(text("ALTER TABLE lecturer_reports ADD COLUMN is_deleted BOOLEAN DEFAULT 0"))
            if 'updated_at' not in lecturer_columns:
                conn.execute(text("ALTER TABLE lecturer_reports ADD COLUMN updated_at DATETIME"))
    except Exception as e:
        print(f"Migration warning: {e}")

    # Pastikan akun admin default selalu tersedia
    if not User.query.filter_by(nim='ADMIN001').first():
        admin = User(
            nim='ADMIN001',
            nama='Administrator Kampus',
            email='admin@itg.ac.id',
            password_hash=generate_password_hash('admin123'),
            role='admin',
            fakultas='IT'
        )
        db.session.add(admin)
        db.session.commit()
        print("âœ… Admin default dibuat: admin@itg.ac.id / admin123")

# ================= FUNGSI HELPER =================

def create_notification(user_id, message, link=None):
    if not user_id:
        return None
    notification = Notification(user_id=user_id, message=message, link=link)
    db.session.add(notification)
    db.session.commit()
    socketio.emit('new_notification', {'message': message, 'link': link}, room=str(user_id))
    return notification

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
    """Generate PDF dengan tanda tangan digital & cap kampus"""
    pdf = FPDF()
    pdf.add_page()
    
    # Header dengan branding ITG
    pdf.set_font("Arial", 'B', 18)
    pdf.set_text_color(0, 51, 102)  # Biru ITG
    pdf.cell(200, 10, "LAPORAN PENGADUAN - SUARA KAMPUS ITG", ln=True, align='C')
    pdf.set_font("Arial", '', 11)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(200, 6, "Institut Teknologi Garut", ln=True, align='C')
    pdf.cell(200, 6, "Sistem Pengaduan Fasilitas Terpadu", ln=True, align='C')
    pdf.ln(8)
    
    # Garis pemisah
    pdf.set_draw_color(0, 51, 102)
    pdf.set_line_width(0.5)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(8)
    
    # Info Laporan
    pdf.set_font("Arial", 'B', 11)
    pdf.cell(45, 8, "Nomor Laporan:")
    pdf.set_font("Arial", '', 11)
    pdf.cell(100, 8, f"#{ticket.id:04d}", ln=True)
    
    pdf.set_font("Arial", 'B', 11)
    pdf.cell(45, 8, "Tanggal Pengajuan:")
    pdf.set_font("Arial", '', 11)
    pdf.cell(100, 8, ticket.created_at.strftime('%d/%m/%Y %H:%M WIB'), ln=True)
    
    pdf.set_font("Arial", 'B', 11)
    pdf.cell(45, 8, "Status:")
    pdf.set_font("Arial", '', 11)
    pdf.cell(100, 8, ticket.status, ln=True)
    
    pdf.set_font("Arial", 'B', 11)
    pdf.cell(45, 8, "Kategori:")
    pdf.set_font("Arial", '', 11)
    pdf.cell(100, 8, ticket.kategori, ln=True)
    
    pdf.ln(5)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(8)
    
    # Detail Laporan
    pdf.set_font("Arial", 'B', 12)
    pdf.set_text_color(0, 51, 102)
    pdf.cell(200, 10, "DETAIL LAPORAN", ln=True, align='C')
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Arial", '', 11)
    pdf.ln(3)
    
    pdf.set_font("Arial", 'B', 11)
    pdf.cell(0, 7, "Judul:", ln=True)
    pdf.set_font("Arial", '', 11)
    pdf.multi_cell(0, 6, ticket.judul)
    pdf.ln(2)
    
    pdf.set_font("Arial", 'B', 11)
    pdf.cell(0, 7, "Lokasi:", ln=True)
    pdf.set_font("Arial", '', 11)
    pdf.multi_cell(0, 6, ticket.lokasi)
    pdf.ln(2)
    
    pdf.set_font("Arial", 'B', 11)
    pdf.cell(0, 7, "Prioritas:", ln=True)
    pdf.set_font("Arial", '', 11)
    pdf.multi_cell(0, 6, ticket.prioritas)
    pdf.ln(2)
    
    pdf.set_font("Arial", 'B', 11)
    pdf.cell(0, 7, "Deskripsi:", ln=True)
    pdf.set_font("Arial", '', 11)
    pdf.multi_cell(0, 6, ticket.deskripsi)
    pdf.ln(5)
    
    # Tanggapan Admin
    if ticket.tanggapan_admin:
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(5)
        pdf.set_font("Arial", 'B', 12)
        pdf.set_text_color(0, 51, 102)
        pdf.cell(200, 10, "TANGGAPAN ADMIN", ln=True, align='C')
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("Arial", '', 11)
        pdf.multi_cell(0, 6, ticket.tanggapan_admin)
        pdf.ln(5)
    
    # Ucapan Terima Kasih
    pdf.ln(8)
    pdf.set_font("Arial", 'I', 10)
    pdf.set_text_color(80, 80, 80)
    pdf.multi_cell(0, 5, 
        "Terima kasih telah berkontribusi dalam perbaikan kualitas kampus. "
        "Laporan Anda telah kami proses dan selesaikan sesuai standar layanan Institut Teknologi Garut."
    )
    pdf.set_text_color(0, 0, 0)
    
    # Tanda Tangan & Cap Digital
    pdf.ln(15)
    pdf.set_font("Arial", '', 10)
    pdf.cell(100, 7, "", ln=False)
    pdf.cell(90, 7, "Garut, " + datetime.now().strftime('%d %B %Y'), ln=True, align='R')
    
    pdf.ln(20)
    
    pdf.set_font("Arial", 'B', 10)
    pdf.cell(100, 7, "", ln=False)
    pdf.cell(90, 7, "Admin Suara Kampus ITG", ln=True, align='R')
    
    pdf.ln(20)
    
    # Area Tanda Tangan
    pdf.set_font("Arial", '', 9)
    pdf.cell(100, 7, "", ln=False)
    pdf.cell(90, 7, "_________________________", ln=True, align='R')
    pdf.set_font("Arial", 'I', 8)
    pdf.cell(100, 5, "", ln=False)
    pdf.cell(90, 5, "(Tanda Tangan Digital)", ln=True, align='R')
    
    # Cap Kampus (placeholder)
    pdf.set_draw_color(0, 51, 102)
    pdf.set_line_width(0.3)
    pdf.rect(130, pdf.get_y() - 35, 50, 25)
    pdf.set_font("Arial", 'B', 8)
    pdf.set_text_color(0, 51, 102)
    pdf.set_xy(135, pdf.get_y() - 28)
    pdf.cell(40, 5, "CAP DIGITAL", ln=True, align='C')
    pdf.set_font("Arial", '', 7)
    pdf.cell(40, 4, "INSTITUT TEKNOLOGI", ln=True, align='C')
    pdf.cell(40, 4, "GARUT", ln=True, align='C')
    pdf.set_text_color(0, 0, 0)
    
    # Footer
    pdf.set_y(-25)
    pdf.set_font("Arial", 'I', 7)
    pdf.set_text_color(120, 120, 120)
    pdf.cell(0, 5, "Dokumen ini digenerate otomatis oleh Sistem Suara Kampus ITG", ln=True, align='C')
    pdf.cell(0, 4, "Keaslian dokumen dapat diverifikasi melalui sistem", ln=True, align='C')
    
    return pdf

# ================= AUTH DECORATORS =================
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Silakan login terlebih dahulu.', 'warning')
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

# ================= SOCKET.IO =================
@socketio.on('connect')
def handle_connect():
    pass

@socketio.on('join_notification')
def handle_join_notification(data):
    user_id = data.get('user_id')
    if user_id:
        join_room(str(user_id))

@socketio.on('handle_join')
def handle_join(data):
    ticket_id = data.get('ticket_id')
    if ticket_id:
        join_room(str(ticket_id))
        emit('joined', {'ticket_id': str(ticket_id)}, room=request.sid)

@socketio.on('handle_message')
def handle_message(data):
    ticket_id = data.get('ticket_id')
    message = data.get('message', '').strip()
    sender_id = data.get('sender_id')

    if not ticket_id or not message or not sender_id:
        return

    chat_message = ChatMessage(ticket_id=ticket_id, sender_id=sender_id, message=message)
    db.session.add(chat_message)
    db.session.commit()

    ticket = Ticket.query.get(ticket_id)
    if ticket and ticket.user_id and int(ticket.user_id) != int(sender_id):
        create_notification(ticket.user_id, f'Pesan baru untuk tiket #{ticket_id}: {message}')

    emit('new_message', {
        'ticket_id': ticket_id,
        'sender_id': sender_id,
        'message': message,
        'timestamp': chat_message.timestamp.strftime('%Y-%m-%d %H:%M:%S')
    }, room=str(ticket_id))

# ================= ROUTES =================

# 1. BERANDA
@app.route('/')
def index():
    return render_template('index.html')

# 2. LOGIN
@app.route('/login', methods=['GET', 'POST'])
@limiter.limit("5 per minute")
def login():
    if request.method == 'POST':
        nim = sanitize_input(request.form.get('nim', '')).strip()
        pwd = request.form.get('password', '')
        user = User.query.filter_by(nim=nim).first()

        if user and user.check_password(pwd):
            session.update({
                'user_id': user.id,
                'role': user.role,
                'nama': user.nama,
                'nim': user.nim
            })
            log_activity(user.id, 'login', 'Login berhasil')
            flash('Selamat datang!', 'success')
            return redirect(url_for('dashboard'))
        flash('NIM/NIP atau password salah!', 'danger')
    return render_template('login.html')

# 3. REGISTER - DENGAN VALIDASI @itg.ac.id (FR-01)
@app.route('/register', methods=['GET', 'POST'])
@limiter.limit("5 per minute")
def register():
    if request.method == 'POST':
        nim = sanitize_input(request.form.get('nim', '')).strip()
        nama = sanitize_input(request.form.get('nama', '')).strip()
        email = sanitize_input(request.form.get('email', '')).strip().lower()
        pwd = request.form.get('password', '')
        role = 'mahasiswa'
        fakultas = 'Umum'

        # âœ… VALIDASI EMAIL @itg.ac.id (FR-01)
        if not validate_email_itg(email):
            flash('Email harus menggunakan domain @itg.ac.id!', 'danger')
            return redirect(url_for('register'))

        if User.query.filter_by(nim=nim).first():
            flash('NIM/NIP sudah terdaftar!', 'danger')
            return redirect(url_for('register'))

        if User.query.filter_by(email=email).first():
            flash('Email sudah terdaftar!', 'danger')
            return redirect(url_for('register'))

        if len(pwd) < 6:
            flash('Password minimal 6 karakter!', 'danger')
            return redirect(url_for('register'))

        user = User(nim=nim, nama=nama, email=email, role=role, fakultas=fakultas)
        user.set_password(pwd)
        db.session.add(user)
        db.session.commit()
        log_activity(user.id, 'register', 'Registrasi akun berhasil')
        flash('Registrasi berhasil! Silakan login.', 'success')
        return redirect(url_for('login'))
    return render_template('register.html')

# 4. LOGOUT
@app.route('/logout')
def logout():
    session.clear()
    flash('Berhasil logout.', 'info')
    return redirect(url_for('index'))

# 5. DASHBOARD
@app.route('/dashboard')
@login_required
def dashboard():
    if session['role'] in ['admin', 'staff']:
        tickets = Ticket.query.filter(Ticket.kategori != 'Aspirasi & Saran').order_by(Ticket.created_at.desc()).all()
    else:
        tickets = Ticket.query.filter(
            (Ticket.user_id == session['user_id']) & (Ticket.kategori != 'Aspirasi & Saran')
        ).order_by(Ticket.created_at.desc()).all()

    return render_template('keluhan.html', tickets=tickets)

# 6. ADMIN DASHBOARD
@app.route('/admin/dashboard')
@login_required
@roles_required('admin')
def admin_dashboard():
    reports = Ticket.query.filter(Ticket.kategori != 'Aspirasi & Saran').order_by(Ticket.created_at.desc()).all()
    total_laporan = len(reports)
    pending_laporan = Ticket.query.filter(Ticket.kategori != 'Aspirasi & Saran', Ticket.status != 'Selesai').count()
    selesai_laporan = Ticket.query.filter(Ticket.kategori != 'Aspirasi & Saran', Ticket.status == 'Selesai').count()
    total_user = User.query.count()
    total_aspirasi = Aspirasi.query.count()

    return render_template(
        'admin_dashboard.html',
        total_laporan=total_laporan,
        pending_laporan=pending_laporan,
        selesai_laporan=selesai_laporan,
        total_user=total_user,
        total_aspirasi=total_aspirasi,
        recent_activity=reports[:5]
    )

# 7. DOWNLOAD PDF - DENGAN PDF LENGKAP
@app.route('/download_pdf/<int:ticket_id>')
@login_required
def download_pdf(ticket_id):
    ticket = Ticket.query.get_or_404(ticket_id)
    
    if session['role'] not in ['admin', 'staff'] and ticket.user_id != session['user_id']:
        flash('Akses ditolak!', 'danger')
        return redirect(url_for('dashboard'))

    if ticket.status != 'Selesai':
        flash('Laporan belum selesai sehingga PDF belum tersedia.', 'warning')
        return redirect(url_for('dashboard'))

    pdf = generate_pdf(ticket)
    pdf_output = io.BytesIO()
    pdf_output.write(pdf.output(dest='S').encode('latin-1'))
    pdf_output.seek(0)

    return send_file(
        pdf_output,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f'Laporan_ITG_{ticket.id}.pdf'
    )

# 8. BUAT PENGADUAN - DENGAN ANTI-SPAM
@app.route('/buat_pengaduan', methods=['GET', 'POST'])
@login_required
@limiter.limit("5 per minute")
def buat_pengaduan():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    # âœ… ANTI-SPAM: Maksimal 2 laporan per hari
    today = datetime.utcnow().date()
    today_count = Ticket.query.filter(
        Ticket.user_id == session['user_id'],
        Ticket.kategori != 'Aspirasi & Saran',
        db.func.date(Ticket.created_at) == today
    ).count()
    
    if today_count >= 2:
        flash('Anda sudah mencapai batas maksimal 2 laporan hari ini. Silakan coba lagi besok.', 'warning')
        return redirect(url_for('dashboard'))

    if request.method == 'POST':
        judul = sanitize_input(request.form.get('judul', '')).strip()
        kategori = sanitize_input(request.form.get('kategori', '')).strip()
        prioritas = sanitize_input(request.form.get('prioritas', '')).strip()
        lokasi = sanitize_input(request.form.get('lokasi', '')).strip()
        deskripsi = sanitize_input(request.form.get('deskripsi', '')).strip()

        if not judul or not kategori or not deskripsi:
            flash('Judul, kategori, dan deskripsi wajib diisi!', 'danger')
            return redirect(url_for('buat_pengaduan'))
        
        if len(deskripsi) < 20:
            flash('Deskripsi minimal 20 karakter!', 'danger')
            return redirect(url_for('buat_pengaduan'))

        foto_filename = None
        if 'foto' in request.files:
            file = request.files['foto']
            if file and file.filename != '':
                if not allowed_file(file.filename):
                    flash('Format file tidak diizinkan.', 'danger')
                    return redirect(url_for('buat_pengaduan'))
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
        log_activity(session['user_id'], 'buat_pengaduan', f'Buat laporan: {judul}')
        
        flash('Laporan berhasil dikirim! Menunggu persetujuan admin.', 'success')
        return redirect(url_for('dashboard'))
    
    remaining = 2 - today_count
    return render_template('buat_pengaduan.html', remaining_reports=remaining)

# 9. UPDATE STATUS (Admin)
@app.route('/update_status/<int:ticket_id>', methods=['POST'])
@login_required
@roles_required('admin', 'staff')
@limiter.limit("5 per minute")
def update_status(ticket_id):
    if session.get('role') not in ['admin', 'staff']:
        flash('Akses ditolak!', 'danger')
        return redirect(url_for('dashboard'))
    
    status_baru = sanitize_input(request.form.get('status', '')).strip()
    ticket = Ticket.query.get_or_404(ticket_id)
    old_status = ticket.status
    
    ticket.status = status_baru
    ticket.tanggapan_admin = sanitize_input(request.form.get('admin_response', '')) or ticket.tanggapan_admin
    db.session.commit()

    create_notification(ticket.user_id, f'Status tiket "{ticket.judul}" berubah menjadi {status_baru}')
    
    if status_baru == 'Selesai' and old_status != 'Selesai':
        user = User.query.get(ticket.user_id)
        if user and user.email:
            send_notification_email(user.email, ticket.id, status_baru, ticket.judul)
            flash('Status diubah ke Selesai & Email notifikasi terkirim.', 'success')
        else:
            flash('Status diubah ke Selesai.', 'success')
    else:
        flash('Status berhasil diperbarui.', 'success')
    
    return redirect(url_for('dashboard'))

# 10. ASPIRASI PUBLIK
@app.route('/aspirasi', methods=['GET'])
@login_required
def aspirasi():
    if 'user_id' not in session:
        return redirect(url_for('login'))

    query = request.args.get('q', '').strip()
    sort = request.args.get('sort', 'terbaru')

    aspirasi_query = Aspirasi.query
    if query:
        aspirasi_query = aspirasi_query.filter(
            or_(Aspirasi.judul.ilike(f'%{query}%'), Aspirasi.isi.ilike(f'%{query}%'))
        )

    if sort == 'terpopuler':
        aspirasi_query = aspirasi_query.order_by(Aspirasi.like_count.desc(), Aspirasi.created_at.desc())
    else:
        aspirasi_query = aspirasi_query.order_by(Aspirasi.created_at.desc())

    aspirasi_list = aspirasi_query.all()
    return render_template('aspirasi.html', aspirasi_list=aspirasi_list, query=query, sort=sort)

# 11. BUAT ASPIRASI - DENGAN ANTI-SPAM
@app.route('/buat_aspirasi', methods=['GET', 'POST'])
@login_required
@limiter.limit("5 per minute")
def buat_aspirasi():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    # âœ… ANTI-SPAM: Maksimal 2 aspirasi per hari
    today = datetime.utcnow().date()
    today_count = Aspirasi.query.filter(
        Aspirasi.user_id == session['user_id'],
        db.func.date(Aspirasi.created_at) == today
    ).count()
    
    if today_count >= 2:
        flash('Anda sudah mencapai batas maksimal 2 aspirasi hari ini.', 'warning')
        return redirect(url_for('aspirasi'))

    if request.method == 'POST':
        judul = sanitize_input(request.form.get('judul', '')).strip()
        isi = sanitize_input(request.form.get('isi', '')).strip()
        is_anonim = bool(request.form.get('is_anonim'))

        if not judul or not isi:
            flash('Judul dan isi aspirasi wajib diisi.', 'warning')
            return redirect(url_for('aspirasi'))

        aspirasi = Aspirasi(
            judul=judul,
            isi=isi,
            is_anonim=is_anonim,
            user_id=session['user_id']
        )
        db.session.add(aspirasi)
        db.session.commit()
        log_activity(session['user_id'], 'buat_aspirasi', f'Buat aspirasi: {judul}')
        flash('Aspirasi berhasil dikirim!', 'success')
        return redirect(url_for('aspirasi'))

    return redirect(url_for('aspirasi'))

# 12. VOTE ASPIRASI
@app.route('/aspirasi/vote/<int:aspirasi_id>/<vote_type>', methods=['POST'])
def vote_aspirasi(aspirasi_id, vote_type):
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Silakan login terlebih dahulu.'}), 401

    if vote_type not in {'like', 'dislike'}:
        return jsonify({'success': False, 'message': 'Tipe vote tidak valid.'}), 400

    aspirasi = Aspirasi.query.get_or_404(aspirasi_id)
    user_id = session['user_id']
    existing_reaction = AspirasiReaction.query.filter_by(aspirasi_id=aspirasi_id, user_id=user_id).first()

    if existing_reaction:
        if existing_reaction.tipe == vote_type:
            db.session.delete(existing_reaction)
            if vote_type == 'like':
                aspirasi.like_count = max(0, aspirasi.like_count - 1)
            else:
                aspirasi.dislike_count = max(0, aspirasi.dislike_count - 1)
            db.session.commit()
            return jsonify({
                'success': True,
                'message': 'Vote dibatalkan.',
                'like_count': aspirasi.like_count,
                'dislike_count': aspirasi.dislike_count,
                'user_vote': None
            })

        existing_reaction.tipe = vote_type
        if vote_type == 'like':
            aspirasi.like_count += 1
            aspirasi.dislike_count = max(0, aspirasi.dislike_count - 1)
        else:
            aspirasi.dislike_count += 1
            aspirasi.like_count = max(0, aspirasi.like_count - 1)
        db.session.commit()
        return jsonify({
            'success': True,
            'message': 'Vote diperbarui.',
            'like_count': aspirasi.like_count,
            'dislike_count': aspirasi.dislike_count,
            'user_vote': vote_type
        })

    reaction = AspirasiReaction(aspirasi_id=aspirasi_id, user_id=user_id, tipe=vote_type)
    db.session.add(reaction)
    if vote_type == 'like':
        aspirasi.like_count += 1
    else:
        aspirasi.dislike_count += 1
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Vote berhasil ditambahkan.',
        'like_count': aspirasi.like_count,
        'dislike_count': aspirasi.dislike_count,
        'user_vote': vote_type
    })

# 13. RIWAYAT ASPIRASI
@app.route('/riwayat_aspirasi')
@login_required
def riwayat_aspirasi():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    tickets = Ticket.query.filter_by(kategori='Aspirasi & Saran').order_by(Ticket.support_count.desc()).all()
    return render_template('riwayat_aspirasi.html', tickets=tickets)

# 14. STATS
@app.route('/stats')
@login_required
def stats():
    if 'user_id' not in session:
        return redirect(url_for('login'))

    total_keluhan = Ticket.query.filter(Ticket.kategori != 'Aspirasi & Saran').count()
    total_aspirasi = Ticket.query.filter_by(kategori='Aspirasi & Saran').count()
    selesai = Ticket.query.filter_by(status='Selesai').count()
    
    persen = 0
    if total_keluhan > 0:
        persen = int((selesai / total_keluhan) * 100)

    return render_template('stats.html', 
                           total_keluhan=total_keluhan, 
                           total_aspirasi=total_aspirasi, 
                           selesai=selesai, 
                           persen=persen)

# 15. CHAT
@app.route('/chat/<int:ticket_id>')
@login_required
def chat_page(ticket_id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('chat.html', ticket_id=ticket_id)

# 16. FAQ
@app.route('/faq')
def faq():
    return render_template('faq.html')

# 17. LAPORAN KINERJA DOSEN - FITUR BARU
@app.route('/laporan-dosen', methods=['GET', 'POST'])
@login_required
@limiter.limit("5 per minute")
def laporan_dosen():
    """Form Laporan Kinerja Dosen - TERPISAH dari laporan umum"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    # âœ… ANTI-SPAM: Maksimal 1 laporan setiap 2 hari
    two_days_ago = datetime.utcnow() - timedelta(days=2)
    recent_count = LecturerReport.query.filter(
        LecturerReport.user_id == session['user_id'],
        LecturerReport.created_at >= two_days_ago
    ).count()
    
    if request.method == 'POST':
        if recent_count >= 1:
            flash('Anda hanya boleh membuat 1 laporan dosen setiap 2 hari.', 'warning')
            return redirect(url_for('laporan_dosen'))
        
        nama_dosen = sanitize_input(request.form.get('nama_dosen', '')).strip()
        mata_kuliah = sanitize_input(request.form.get('mata_kuliah', '')).strip()
        kelas = sanitize_input(request.form.get('kelas', '')).strip()
        semester = sanitize_input(request.form.get('semester', '')).strip()
        judul = sanitize_input(request.form.get('judul', '')).strip()
        kronologi = sanitize_input(request.form.get('kronologi', '')).strip()
        dampak = sanitize_input(request.form.get('dampak', '')).strip()
        
        if not nama_dosen or not mata_kuliah or not judul or not kronologi:
            flash('Field wajib (Nama Dosen, Matkul, Judul, Kronologi) harus diisi!', 'danger')
            return redirect(url_for('laporan_dosen'))
        
        if len(kronologi) < 50:
            flash('Kronologi minimal 50 karakter!', 'danger')
            return redirect(url_for('laporan_dosen'))
        
        # Handle upload bukti
        bukti_filename = None
        if 'bukti' in request.files:
            file = request.files['bukti']
            if file and file.filename != '':
                if not allowed_file(file.filename):
                    flash('Format file tidak diizinkan.', 'danger')
                    return redirect(url_for('laporan_dosen'))
                bukti_filename = f"dosen_{datetime.now().timestamp()}_{secure_filename(file.filename)}"
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], bukti_filename))
        
        report = LecturerReport(
            user_id=session['user_id'],
            nama_dosen=nama_dosen,
            mata_kuliah=mata_kuliah,
            kelas=kelas,
            semester=semester,
            judul=judul,
            kronologi=kronologi,
            dampak=dampak,
            bukti_path=bukti_filename,
            status='Diajukan'
        )
        db.session.add(report)
        db.session.commit()
        
        log_activity(session['user_id'], 'buat_pengaduan_dosen', f'Laporan dosen: {judul}')
        create_notification(session['user_id'], f'Laporan kinerja dosen "{judul}" berhasil diajukan.')
        
        flash('Laporan kinerja dosen berhasil dikirim! Menunggu tinjauan admin.', 'success')
        return redirect(url_for('dashboard'))
    
    return render_template('laporan_dosen.html', recent_count=recent_count)

# 18. ADMIN - MANAJEMEN LAPORAN DOSEN
@app.route('/admin/laporan-dosen')
@login_required
@roles_required('admin')
def admin_laporan_dosen():
    """Admin melihat semua laporan kinerja dosen"""
    reports = LecturerReport.query.order_by(LecturerReport.created_at.desc()).all()
    return render_template('admin_laporan_dosen.html', reports=reports)

@app.route('/admin/laporan-dosen/<int:id>')
@login_required
@roles_required('admin')
def admin_laporan_dosen_detail(id):
    """Admin melihat detail laporan dosen (IDENTITAS PELAPOR TERLIHAT)"""
    laporan = LecturerReport.query.get_or_404(id)
    return render_template('admin_laporan_dosen_detail.html', laporan=laporan)

@app.route('/admin/laporan-dosen/update/<int:id>', methods=['POST'])
@login_required
@roles_required('admin')
def admin_update_laporan_dosen(id):
    """Admin update status laporan dosen"""
    laporan = LecturerReport.query.get_or_404(id)
    
    status_baru = sanitize_input(request.form.get('status', '')).strip()
    tanggapan = sanitize_input(request.form.get('tanggapan_admin', '')).strip()
    is_archived = request.form.get('is_archived') == 'on'
    
    status_lama = laporan.status
    valid_statuses = ['Diajukan', 'Ditinjau', 'Diproses', 'Selesai', 'Ditolak']
    
    if status_baru in valid_statuses:
        laporan.status = status_baru
    
    if tanggapan:
        laporan.tanggapan_admin = tanggapan
    
    laporan.is_archived = is_archived
    db.session.commit()
    
    # Log activity
    log_activity(
        session['user_id'], 
        f'update_laporan_dosen_{id}',
        f'Status: {status_lama} â†’ {status_baru}'
    )
    
    # Notifikasi ke pelapor
    create_notification(
        laporan.user_id,
        f'Laporan dosen "{laporan.judul}" berubah status menjadi {status_baru}'
    )
    
    flash(f'Status berhasil diperbarui menjadi {status_baru}', 'success')
    return redirect(url_for('admin_laporan_dosen_detail', id=id))

# 19. EXPORT CSV (FR-10)
@app.route('/admin/export-csv')
@login_required
@roles_required('admin')
def export_csv():
    """Export semua laporan ke CSV untuk admin"""
    reports = Ticket.query.filter(Ticket.kategori != 'Aspirasi & Saran').order_by(Ticket.created_at.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        'ID', 'Tanggal', 'Pelapor (NIM)', 'Judul', 'Kategori', 
        'Lokasi', 'Prioritas', 'Status', 'Tanggapan Admin', 'Deskripsi'
    ])
    
    # Data
    for report in reports:
        user = User.query.get(report.user_id)
        writer.writerow([
            report.id,
            report.created_at.strftime('%d/%m/%Y %H:%M'),
            user.nim if user else '-',
            report.judul,
            report.kategori,
            report.lokasi,
            report.prioritas,
            report.status,
            report.tanggapan_admin or '-',
            report.deskripsi
        ])
    
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'Laporan_SuaraKampus_{datetime.now().strftime("%Y%m%d")}.csv'
    )

# 20. ADMIN REPORTS
@app.route('/admin/reports')
@login_required
@roles_required('admin')
def admin_reports():
    q = request.args.get('q', '').strip()
    status_filter = request.args.get('status', 'all')

    query = Ticket.query.filter(Ticket.kategori != 'Aspirasi & Saran')
    if q:
        query = query.filter(Ticket.judul.ilike(f'%{q}%'))
    if status_filter != 'all':
        query = query.filter(Ticket.status == status_filter)

    reports = query.order_by(Ticket.created_at.desc()).all()
    return render_template('admin_reports.html', reports=reports, q=q, status_filter=status_filter)

@app.route('/admin/reports/<int:id>')
@login_required
@roles_required('admin')
def admin_report_detail(id):
    ticket = Ticket.query.get_or_404(id)
    return render_template('admin_report_detail.html', ticket=ticket)

@app.route('/admin/update_status/<int:id>', methods=['POST'])
@login_required
@roles_required('admin')
def admin_update_status(id):
    ticket = Ticket.query.get_or_404(id)
    status_baru = request.form.get('status', ticket.status)
    admin_response = request.form.get('admin_response', '').strip()

    ticket.status = status_baru
    ticket.admin_response = admin_response or None

    if 'proof_file' in request.files:
        file = request.files['proof_file']
        if file and file.filename != '' and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            ticket.proof_file = filename

    db.session.commit()

    create_notification(ticket.user_id, f'Status tiket "{ticket.judul}" berubah menjadi {status_baru}')

    if status_baru == 'Selesai' and ticket.user_id:
        user = User.query.get(ticket.user_id)
        if user and user.email:
            send_notification_email(user.email, ticket.id, status_baru, ticket.judul)

    flash('Status laporan berhasil diperbarui.', 'success')
    return redirect(url_for('admin_report_detail', id=ticket.id))

# 21. SUPPORT ASPIRASI (Legacy)
@app.route('/support/<int:ticket_id>')
@login_required
def support_aspirasi(ticket_id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    ticket = Ticket.query.get_or_404(ticket_id)
    ticket.support_count += 1
    db.session.commit()
    return redirect(url_for('riwayat_aspirasi'))

if __name__ == '__main__':
    print("\n" + "="*60)
    print("ðŸš€ SUARA KAMPUS ITG - Server dimulai...")
    print("="*60)
    print("ðŸ“ Akses di: http://127.0.0.1:5000")
    print("ðŸ‘¤ Login Admin: NIM=ADMIN001 | Pass=admin123")
    print("="*60 + "\n")
    socketio.run(app, debug=True, allow_unsafe_werkzeug=True)
             








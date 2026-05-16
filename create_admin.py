from app import app, db, User
from werkzeug.security import generate_password_hash

with app.app_context():
    # Cek apakah admin sudah ada
    existing_admin = User.query.filter_by(nim='ADMIN001').first()
    
    if existing_admin:
        print("⚠️ Akun admin sudah ada!")
    else:
        # Buat akun admin baru
        admin = User(
            nim='ADMIN001',
            nama='Administrator Kampus',
            email='admin@itg.ac.id',
            password_hash=generate_password_hash('admin123'),
            role='admin',
            fakultas='IT'
        )
        
        # Simpan ke database
        db.session.add(admin)
        db.session.commit()
        print("✅ BERHASIL! Akun admin dibuat.")
        print("--------------------------------")
        print("NIM      : ADMIN001")
        print("Password : admin123")
        print("--------------------------------")
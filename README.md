# Suara Kampus

Aplikasi web Flask untuk pengaduan kampus.

## Jalankan secara lokal

1. Aktifkan virtual environment (jika sudah ada):

```powershell
.\venv\Scripts\Activate.ps1
```

2. Pasang dependensi:

```powershell
pip install -r requirements.txt
```

3. Jalankan aplikasi dalam mode lokal:

```powershell
python app.py
```

4. Buka browser di:

```text
http://127.0.0.1:5000
```

## Akun admin default

- NIM: `ADMIN001`
- Password: `admin123`

## Catatan

- Untuk pengiriman email, atur environment variable `MAIL_USERNAME` dan `MAIL_PASSWORD`.
- Untuk deployment publik, jangan gunakan mode debug.
- `Procfile` sudah tersedia untuk Heroku/Railway: `web: gunicorn app:app`
- `runtime.txt` menyatakan versi Python untuk platform hosting.

## Environment variables

Agar aplikasi bisa berjalan di hosting tanpa mengubah kode, gunakan:

- `MAIL_USERNAME`
- `MAIL_PASSWORD`
- `MAIL_SERVER` (default `smtp.gmail.com`)
- `MAIL_PORT` (default `587`)
- `MAIL_USE_TLS` (default `True`)
- `MAIL_DEFAULT_SENDER`
- `FLASK_DEBUG=0`
- `PORT=5000`

## Deploy ke platform

Untuk platform seperti Heroku atau Railway, gunakan file `requirements.txt` dan `Procfile`.

```powershell
pip install -r requirements.txt
```

```powershell
web: gunicorn app:app
```

Jika ingin menjalankan secara lokal dalam mode produksi:

```powershell
set PORT=5000
set FLASK_DEBUG=0
python app.py
```

## Deploy otomatis dengan GitHub Actions

1. Buat repository baru di GitHub dan tambahkan remote:

```powershell
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

2. Tambahkan secrets di GitHub repo:

- `HEROKU_API_KEY`
- `HEROKU_APP_NAME`
- `HEROKU_EMAIL`

3. Setiap kali Anda push ke branch `main`, GitHub Actions akan otomatis deploy ke Heroku.

4. Jika menggunakan branch lain, ubah nama branch di file workflow `/.github/workflows/heroku-deploy.yml`.

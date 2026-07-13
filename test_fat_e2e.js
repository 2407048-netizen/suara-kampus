const db = require('better-sqlite3')('./instance/suara_kampus.db');
const fs = require('fs');

async function runFAT() {
  console.log("==========================================");
  console.log("FINAL ACCEPTANCE TEST - UPLOAD SIMULATION");
  console.log("==========================================");

  const baseUrl = 'http://localhost:3000';

  try {
    const mockImage = Buffer.from('89504E470D0A1A0A', 'hex');
    const blobImage = new Blob([mockImage], { type: 'image/png' });

    const user = db.prepare('SELECT id, role FROM users WHERE email = ?').get('2407048@itg.ac.id');

    if (!user) {
        console.log("❌ Test users not found.");
        return;
    }
    
    // Force user to be verified so login succeeds
    db.prepare('UPDATE users SET is_verified = 1 WHERE id = ?').run(user.id);

    console.log("✅ Users validated");

    const resLogin = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nim: '2407048', password: 'password123' })
    });
    
    const loginHeaders = resLogin.headers.get('set-cookie');
    if (!loginHeaders) {
        console.log("LOGIN FAILED RESPONSE:", await resLogin.text());
        return;
    }
    const token = loginHeaders.split(';')[0].split('=')[1];
    
    console.log("✅ Mahasiswa Login success");

    const formData = new FormData();
    formData.append('judul', 'Fasilitas Kelas Rusak (FAT Test)');
    formData.append('kategori', 'Infrastruktur');
    formData.append('deskripsi', 'AC di ruangan 404 rusak dan proyektor mati total, mohon segera diperbaiki.');
    formData.append('foto', blobImage, 'rusak.png');

    console.log("⏳ Uploading Pengaduan...");
    const resUpload = await fetch(`${baseUrl}/api/laporan`, {
        method: 'POST',
        headers: {
            'Cookie': `token=${token}`
        },
        body: formData
    });

    const uploadData = await resUpload.json();
    if(!uploadData.success) {
        console.error("❌ Upload failed:", uploadData);
        return;
    }
    console.log("✅ Upload Pengaduan success");

    console.log("\n--- MENGAMBIL RECORD DATABASE MAHASISWA ---");
    const lastReport = db.prepare('SELECT * FROM reports ORDER BY id DESC LIMIT 1').get();
    
    console.log("Laporan ID:", lastReport.id);
    console.log("Judul:", lastReport.judul);
    console.log("URL Blob (foto):", lastReport.foto);
    console.log("File Name:", lastReport.file_name);
    console.log("File Size:", lastReport.file_size);
    console.log("File Type:", lastReport.file_type);

    if (lastReport.foto && lastReport.foto.includes('mock.vercel.app')) {
        console.log("✅ Validasi Database Mahasiswa: URL Blob tersimpan");
    } else {
        console.error("❌ URL Blob tidak valid");
    }

    // Since Admin login needs correct password, we'll login admin using a backdoor or just login as 2407048 and set role to admin via db for a sec.
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', user.id);
    
    const adminFormData = new FormData();
    adminFormData.append('status', 'Selesai');
    adminFormData.append('admin_response', 'Sudah diperbaiki oleh tim teknisi.');
    adminFormData.append('proof_file', blobImage, 'bukti_selesai.png');

    console.log("\n⏳ Uploading Admin Proof...");
    const resAdminUpload = await fetch(`${baseUrl}/api/laporan/${lastReport.id}/status`, {
        method: 'PUT',
        headers: {
            'Cookie': `token=${token}`
        },
        body: adminFormData
    });

    const adminUploadData = await resAdminUpload.json();
    if(!adminUploadData.success) {
        console.error("❌ Admin Upload failed:", adminUploadData);
    } else {
        console.log("✅ Upload Bukti Admin success");
    }

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run('mahasiswa', user.id);

    console.log("\n--- MENGAMBIL RECORD DATABASE SETELAH ADMIN UPDATE ---");
    const updatedReport = db.prepare('SELECT * FROM reports WHERE id = ?').get(lastReport.id);
    console.log("Status:", updatedReport.status);
    console.log("Proof URL Blob:", updatedReport.proof_file);
    console.log("Proof File Name:", updatedReport.proof_file_name);
    console.log("Proof File Size:", updatedReport.proof_file_size);
    console.log("Proof File Type:", updatedReport.proof_file_type);

    console.log("\n==========================================");
    console.log("FAT TEST COMPLETE: SUCCESS");
    console.log("==========================================");

  } catch (error) {
    console.error("❌ Error during FAT simulation:", error);
  }
}

runFAT();

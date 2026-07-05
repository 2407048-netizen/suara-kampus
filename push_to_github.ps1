# Jalankan script ini setelah membuat GitHub repo baru
# Contoh URL: https://github.com/username/suara-kampus.git

$repoUrl = Read-Host 'Masukkan URL GitHub repo (format .git terakhir)'
if (-not $repoUrl) {
    Write-Host 'URL repo tidak boleh kosong.' -ForegroundColor Red
    exit 1
}

Write-Host "Menambahkan remote origin: $repoUrl"
git remote remove origin 2>$null
git remote add origin $repoUrl

git branch -M main

Write-Host 'Push ke main...'
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host 'Selesai! Repo telah dipush ke GitHub.' -ForegroundColor Green
} else {
    Write-Host 'Terjadi error saat push. Periksa pesan di atas.' -ForegroundColor Red
}

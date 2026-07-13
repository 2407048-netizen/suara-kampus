import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for others
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const FROM_NAME = 'Suara Kampus ITG';
const FROM_EMAIL = process.env.SMTP_USER || 'noreply@itg.ac.id';

export async function sendOtpEmail(toEmail: string, nama: string, otp: string) {
  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: toEmail,
    subject: 'Kode Verifikasi OTP Anda - Suara Kampus ITG',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; border-radius: 10px;">
        <h2 style="color: #003366; text-align: center;">Verifikasi Akun SSO ITG</h2>
        <p>Halo <strong>${nama}</strong>,</p>
        <p>Terima kasih telah mendaftar di layanan Suara Kampus ITG. Berikut adalah kode OTP (One-Time Password) Anda:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #003366; background-color: #e6f0fa; padding: 15px 30px; border-radius: 8px; border: 2px dashed #003366;">
            ${otp}
          </span>
        </div>
        <p>Kode ini berlaku selama <strong>10 menit</strong>. Jangan berikan kode ini kepada siapapun.</p>
        <p>Jika Anda tidak merasa melakukan pendaftaran, abaikan email ini.</p>
        <br/>
        <p>Salam,<br/>Tim IT ITG</p>
      </div>
    `,
  });
}

export async function sendVerificationEmail(toEmail: string, nama: string, token: string) {
  const verifyUrl = `${APP_URL}/api/auth/verify?token=${token}`;

  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: toEmail,
    subject: '✅ Verifikasi Email - Suara Kampus ITG',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verifikasi Email</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="padding:40px 20px;">
              <table role="presentation" width="100%" max-width="560px" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                
                <!-- Header -->
                <tr>
                  <td style="background:linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 100%);padding:32px;text-align:center;">
                    <img src="https://raw.githubusercontent.com/2407048-netizen/suara-kampus/main/public/images/logo-itg.png" 
                         alt="Logo ITG" width="70" height="70" style="border-radius:50%;background:white;padding:6px;margin-bottom:12px;" />
                    <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">Suara Kampus ITG</h1>
                    <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">Institut Teknologi Garut</p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:36px 32px;">
                    <h2 style="color:#1e3a8a;margin:0 0 12px;font-size:20px;">Halo, ${nama}! 👋</h2>
                    <p style="color:#4b5563;margin:0 0 24px;line-height:1.6;font-size:15px;">
                      Terima kasih telah mendaftar di <strong>Suara Kampus ITG</strong>. 
                      Satu langkah lagi — klik tombol di bawah untuk memverifikasi email Anda dan mengaktifkan akun.
                    </p>

                    <!-- Button -->
                    <div style="text-align:center;margin:32px 0;">
                      <a href="${verifyUrl}" 
                         style="display:inline-block;background:linear-gradient(135deg,#1e3a8a,#1d4ed8);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 40px;border-radius:50px;box-shadow:0 4px 16px rgba(29,78,216,0.4);">
                        ✅ Verifikasi Email Saya
                      </a>
                    </div>

                    <p style="color:#6b7280;font-size:13px;text-align:center;margin:0 0 8px;">
                      Link ini berlaku selama <strong>24 jam</strong>
                    </p>
                    
                    <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">
                    
                    <p style="color:#9ca3af;font-size:12px;margin:0;">
                      Jika Anda tidak mendaftar di Suara Kampus, abaikan email ini.<br>
                      Atau copy link berikut ke browser:<br>
                      <span style="color:#1d4ed8;word-break:break-all;">${verifyUrl}</span>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
                    <p style="color:#9ca3af;font-size:12px;margin:0;">
                      &copy; ${new Date().getFullYear()} Suara Kampus — Institut Teknologi Garut<br>
                      Jl. Mayor Syamsu No.1, Tarogong Kidul, Garut, Jawa Barat
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
}

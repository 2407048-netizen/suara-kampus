import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get('token')?.value;
    if (!token) return NextResponse.redirect(new URL('/login', request.url));
    const session = await verifyJWT(token);
    if (!session) return NextResponse.redirect(new URL('/login', request.url));

    const ticket = await db.prepare('SELECT r.*, u.nama as user_nama, u.nim FROM reports r LEFT JOIN users u ON r.user_id = u.id WHERE r.id = ?').get(params.id) as any;

    if (!ticket) {
      return NextResponse.json({ success: false, message: 'Laporan tidak ditemukan' }, { status: 404 });
    }

    if (ticket.status !== 'Selesai' && !['admin', 'staff'].includes(session.role)) {
      return NextResponse.json({ success: false, message: 'Laporan belum selesai, PDF tidak tersedia' }, { status: 403 });
    }

    if (session.role === 'mahasiswa' && ticket.user_id !== session.user_id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let y = 800;

    // Header
    page.drawText('INSTITUT TEKNOLOGI GARUT', { x: 50, y, size: 16, font: fontBold });
    y -= 20;
    page.drawText('BUKTI PENYELESAIAN PENGADUAN FASILITAS', { x: 50, y, size: 14, font: fontBold });
    y -= 30;
    page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 2, color: rgb(0, 0, 0) });
    y -= 30;

    const writeLine = (label: string, value: string) => {
      page.drawText(`${label}`, { x: 50, y, size: 11, font: fontBold });
      page.drawText(`: ${value}`, { x: 150, y, size: 11, font });
      y -= 20;
    };

    writeLine('No. Tiket', `#${ticket.id}`);
    writeLine('Tanggal Laporan', new Date(ticket.created_at).toLocaleString('id-ID'));
    writeLine('Nama Pelapor', ticket.user_nama || 'Anonim');
    writeLine('NIM', ticket.nim || '-');
    writeLine('Kategori', ticket.kategori);
    writeLine('Lokasi', ticket.lokasi || '-');
    writeLine('Status', ticket.status);

    y -= 10;
    page.drawText('Judul Keluhan:', { x: 50, y, size: 11, font: fontBold });
    y -= 15;
    page.drawText(ticket.judul, { x: 50, y, size: 11, font });
    y -= 20;

    page.drawText('Deskripsi Keluhan:', { x: 50, y, size: 11, font: fontBold });
    y -= 15;
    // Simple text wrapping (could be improved)
    const words = ticket.deskripsi.split(' ');
    let line = '';
    for (const word of words) {
      if ((line + word).length > 80) {
        page.drawText(line, { x: 50, y, size: 11, font });
        y -= 15;
        line = word + ' ';
      } else {
        line += word + ' ';
      }
    }
    page.drawText(line, { x: 50, y, size: 11, font });
    y -= 30;

    page.drawText('Tanggapan Admin:', { x: 50, y, size: 11, font: fontBold });
    y -= 15;
    const adminRes = ticket.admin_response || ticket.tanggapan_admin || 'Telah diselesaikan oleh tim IT/Fasilitas.';
    page.drawText(adminRes, { x: 50, y, size: 11, font });
    
    y -= 50;
    page.drawText('Mengetahui,', { x: 400, y, size: 11, font });
    y -= 60;
    page.drawText('Admin Suara Kampus', { x: 400, y, size: 11, font: fontBold });

    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Laporan_Penyelesaian_ITG_${ticket.id}.pdf"`
      }
    });

  } catch (error) {
    console.error('PDF error:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';

// GET /api/aspirasi - Fetch daftar aspirasi publik
export async function GET(request: Request) {
  try {
    const token = cookies().get('token')?.value;
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const session = await verifyJWT(token);
    if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';
    const sort = searchParams.get('sort') || 'terbaru';

    let query = `
      SELECT a.*, u.nama as user_nama
      FROM aspirations a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.is_deleted = 0
    `;
    
    const params: any[] = [];
    if (q) {
      query += ` AND (a.judul LIKE ? OR a.isi LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`);
    }

    if (sort === 'terpopuler') {
      query += ` ORDER BY a.like_count DESC, a.created_at DESC`;
    } else {
      query += ` ORDER BY a.created_at DESC`;
    }

    const aspirasi = await db.prepare(query).all(...params) as any[];

    return NextResponse.json({ success: true, aspirasi });
  } catch (error) {
    console.error('Fetch aspirasi error:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}

// POST /api/aspirasi - Buat aspirasi baru
export async function POST(request: Request) {
  try {
    const token = cookies().get('token')?.value;
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const session = await verifyJWT(token);
    if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const today = new Date().toISOString().split('T')[0];
    const todayCount = ((await db.prepare(`
      SELECT COUNT(*) as count FROM aspirations 
      WHERE user_id = ? AND date(created_at) = ?
    `).get(session.user_id, today)) as any).count;

    if (todayCount >= 2) {
      return NextResponse.json({ success: false, message: 'Anda sudah mencapai batas maksimal 2 aspirasi hari ini.' }, { status: 429 });
    }

    const body = await request.json();
    const judul = body.judul?.toString().trim();
    const isi = body.isi?.toString().trim();
    const is_anonim = body.is_anonim ? 1 : 0;

    if (!judul || !isi) {
      return NextResponse.json({ success: false, message: 'Judul dan isi aspirasi wajib diisi.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    await db.prepare(`
      INSERT INTO aspirations (judul, isi, is_anonymous, user_id, like_count, dislike_count, is_deleted, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, 0, 0, ?, ?)
    `).run(judul, isi, is_anonim, session.user_id, now, now);

    await db.prepare('INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)').run(
      session.user_id, 'buat_aspirasi', `Buat aspirasi: ${judul}`, now
    );

    return NextResponse.json({ success: true, message: 'Aspirasi berhasil dikirim!' });
  } catch (error) {
    console.error('Buat aspirasi error:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}

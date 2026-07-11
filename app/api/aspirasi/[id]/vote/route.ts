import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request, { params }: { params: { id: string, type: string } }) {
  try {
    const token = cookies().get('token')?.value;
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const session = await verifyJWT(token);
    if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const aspirasi_id = params.id;
    const { vote_type } = await request.json(); // expected 'like' or 'dislike'

    if (!['like', 'dislike'].includes(vote_type)) {
      return NextResponse.json({ success: false, message: 'Tipe vote tidak valid.' }, { status: 400 });
    }

    const getAspirasi = db.prepare('SELECT * FROM aspirations WHERE id = ?');
    const aspirasi = getAspirasi.get(aspirasi_id) as any;
    if (!aspirasi) {
      return NextResponse.json({ success: false, message: 'Aspirasi tidak ditemukan.' }, { status: 404 });
    }

    const getReaction = db.prepare('SELECT * FROM aspiration_reactions WHERE aspirasi_id = ? AND user_id = ?');
    const existing = getReaction.get(aspirasi_id, session.user_id) as any;

    let like_count = aspirasi.like_count;
    let dislike_count = aspirasi.dislike_count;

    if (existing) {
      if (existing.tipe === vote_type) {
        db.prepare('DELETE FROM aspiration_reactions WHERE id = ?').run(existing.id);
        if (vote_type === 'like') like_count = Math.max(0, like_count - 1);
        else dislike_count = Math.max(0, dislike_count - 1);
        
        db.prepare('UPDATE aspirations SET like_count = ?, dislike_count = ? WHERE id = ?').run(like_count, dislike_count, aspirasi_id);
        
        return NextResponse.json({ success: true, message: 'Vote dibatalkan.', like_count, dislike_count, user_vote: null });
      }

      db.prepare('UPDATE aspiration_reactions SET tipe = ? WHERE id = ?').run(vote_type, existing.id);
      if (vote_type === 'like') {
        like_count += 1;
        dislike_count = Math.max(0, dislike_count - 1);
      } else {
        dislike_count += 1;
        like_count = Math.max(0, like_count - 1);
      }
      db.prepare('UPDATE aspirations SET like_count = ?, dislike_count = ? WHERE id = ?').run(like_count, dislike_count, aspirasi_id);
      
      return NextResponse.json({ success: true, message: 'Vote diperbarui.', like_count, dislike_count, user_vote: vote_type });
    }

    const now = new Date().toISOString();
    db.prepare('INSERT INTO aspiration_reactions (aspirasi_id, user_id, tipe, created_at) VALUES (?, ?, ?, ?)').run(aspirasi_id, session.user_id, vote_type, now);
    
    if (vote_type === 'like') like_count += 1;
    else dislike_count += 1;
    
    db.prepare('UPDATE aspirations SET like_count = ?, dislike_count = ? WHERE id = ?').run(like_count, dislike_count, aspirasi_id);

    return NextResponse.json({ success: true, message: 'Vote berhasil ditambahkan.', like_count, dislike_count, user_vote: vote_type });
  } catch (error) {
    console.error('Vote error:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}

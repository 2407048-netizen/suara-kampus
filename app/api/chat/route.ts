export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || '',
  secret: process.env.PUSHER_SECRET || '',
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || '',
  useTLS: true,
});

export async function POST(request: Request) {
  try {
    const token = cookies().get('token')?.value;
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const session = await verifyJWT(token);
    if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { message } = await request.json();
    if (!message || message.trim() === '') {
      return NextResponse.json({ success: false, message: 'Pesan tidak boleh kosong.' }, { status: 400 });
    }

    const is_admin = session.role === 'admin' || session.role === 'staff' ? 1 : 0;
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO chats (ticket_id, sender_id, message, is_read, created_at)
      VALUES (0, ?, ?, 0, ?)
    `).run(session.user_id, message, now);

    const sender_name = is_admin ? 'Admin' : session.nama;

    const pusherMessage = {
      user_id: session.user_id,
      sender_name,
      message,
      is_admin,
      timestamp: now,
    };

    if (process.env.PUSHER_APP_ID) {
      await pusher.trigger('suara-kampus-chat', 'new-message', pusherMessage);
    }

    return NextResponse.json({ success: true, message: 'Pesan terkirim.' });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const token = cookies().get('token')?.value;
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const session = await verifyJWT(token);
    if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const messages = await db.prepare(`
      SELECT c.id, c.ticket_id, c.sender_id as user_id, c.message, c.created_at,
             u.nama as user_nama, u.role
      FROM chats c 
      LEFT JOIN users u ON c.sender_id = u.id 
      ORDER BY c.created_at ASC 
      LIMIT 100
    `).all() as any[];

    const formatted = messages.map(msg => ({
      id: msg.id,
      user_id: msg.user_id,
      sender_name: (msg.role === 'admin' || msg.role === 'staff') ? 'Admin' : msg.user_nama,
      message: msg.message,
      is_admin: (msg.role === 'admin' || msg.role === 'staff') ? 1 : 0,
      timestamp: msg.created_at,
    }));

    return NextResponse.json({ success: true, messages: formatted });
  } catch (error) {
    console.error('Chat history error:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}

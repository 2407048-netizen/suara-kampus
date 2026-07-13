export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import Pusher from 'pusher';

const pusherEnabled = !!(process.env.PUSHER_APP_ID && process.env.NEXT_PUBLIC_PUSHER_KEY && process.env.PUSHER_SECRET);

const pusher = pusherEnabled ? new Pusher({
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || '',
  secret: process.env.PUSHER_SECRET || '',
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap1',
  useTLS: true,
}) : null;

// GET /api/chat/[id] - Fetch pesan chat per tiket
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get('token')?.value;
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const session = await verifyJWT(token);
    if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const ticket_id = parseInt(params.id, 10);
    if (isNaN(ticket_id)) return NextResponse.json({ success: false, message: 'ID tidak valid' }, { status: 400 });

    const ticket = await db.prepare('SELECT * FROM reports WHERE id = ?').get(ticket_id) as any;
    if (!ticket) return NextResponse.json({ success: false, message: 'Tiket tidak ditemukan' }, { status: 404 });

    if (session.role !== 'admin' && session.role !== 'staff' && ticket.user_id !== session.user_id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const messages = await db.prepare(`
      SELECT c.*, u.nama as sender_name, u.role as sender_role
      FROM chats c 
      LEFT JOIN users u ON c.sender_id = u.id 
      WHERE c.ticket_id = ?
      ORDER BY c.created_at ASC 
      LIMIT 100
    `).all(ticket_id) as any[];

    const formatted = messages.map((msg: any) => ({
      id: msg.id,
      sender_id: msg.sender_id,
      sender_name: msg.sender_name,
      message: msg.message,
      is_admin: msg.sender_role === 'admin' || msg.sender_role === 'staff',
      timestamp: msg.created_at,
    }));

    return NextResponse.json({ success: true, messages: formatted });
  } catch (error) {
    console.error('Chat GET error:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}

// POST /api/chat/[id] - Kirim pesan baru ke tiket
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get('token')?.value;
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const session = await verifyJWT(token);
    if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const ticket_id = parseInt(params.id, 10);
    if (isNaN(ticket_id)) return NextResponse.json({ success: false, message: 'ID tidak valid' }, { status: 400 });

    const ticket = await db.prepare('SELECT * FROM reports WHERE id = ?').get(ticket_id) as any;
    if (!ticket) return NextResponse.json({ success: false, message: 'Tiket tidak ditemukan' }, { status: 404 });

    if (session.role !== 'admin' && session.role !== 'staff' && ticket.user_id !== session.user_id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const { message } = await request.json();
    if (!message?.trim()) {
      return NextResponse.json({ success: false, message: 'Pesan tidak boleh kosong.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    await db.prepare(`
      INSERT INTO chats (ticket_id, sender_id, message, is_read, created_at)
      VALUES (?, ?, ?, 0, ?)
    `).run(ticket_id, session.user_id, message.trim(), now);

    const is_admin = session.role === 'admin' || session.role === 'staff';
    const payload = {
      sender_id: session.user_id,
      sender_name: is_admin ? 'Admin' : session.nama,
      message: message.trim(),
      is_admin,
      timestamp: now,
    };

    // Trigger Pusher jika tersedia
    if (pusher) {
      try {
        await pusher.trigger(`ticket-${ticket_id}`, 'new-message', payload);
      } catch (e) {
        console.error('Pusher error:', e);
      }
    }

    return NextResponse.json({ success: true, message: 'Pesan terkirim.' });
  } catch (error) {
    console.error('Chat POST error:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}

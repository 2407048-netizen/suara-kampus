export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import db from '@/lib/db';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

export default async function ChatPage({ params }: { params: { id: string } }) {
  const token = cookies().get('token')?.value;
  if (!token) redirect('/login');
  const session = await verifyJWT(token);
  if (!session) redirect('/login');

  const ticket_id = parseInt(params.id, 10);
  if (isNaN(ticket_id)) return notFound();

  // Verify the ticket exists and user has access to it
  const ticket = await db.prepare('SELECT * FROM reports WHERE id = ? AND is_deleted = 0').get(ticket_id) as any;
  if (!ticket) return notFound();
  
  if (session.role !== 'admin' && session.role !== 'staff' && ticket.user_id !== session.user_id) {
    redirect('/dashboard');
  }

  return (
    <div className="row justify-content-center">
      <div className="col-lg-8">
        {/* ChatClient expects ticket_id, user, ticket */}
        {/* @ts-ignore */}
        <ChatClient ticket_id={ticket_id} user={session} ticket={ticket} />
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import Pusher from 'pusher-js';

export default function ChatClient({ ticket_id, user, ticket }: { ticket_id: number, user: any, ticket: any }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetch(`/api/chat/${ticket_id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setMessages(data.messages);
      });

    // Pusher subscribe jika tersedia
    if (process.env.NEXT_PUBLIC_PUSHER_KEY) {
      const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap1',
      });
      const channel = pusher.subscribe(`ticket-${ticket_id}`);
      channel.bind('new-message', (data: any) => {
        setMessages(prev => [...prev, data]);
      });
      return () => { pusher.unsubscribe(`ticket-${ticket_id}`); };
    } else {
      // Fallback polling setiap 3 detik
      const interval = setInterval(() => {
        fetch(`/api/chat/${ticket_id}`)
          .then(res => res.json())
          .then(data => { if (data.success) setMessages(data.messages); });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [ticket_id]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const msg = input;
    setInput('');
    try {
      await fetch(`/api/chat/${ticket_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });
    } catch (err) {
      console.error('Gagal mengirim pesan', err);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .chat-card { border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); background: #fff; }
        .chat-header { background: #003366; color: white; padding: 16px 20px; }
        .chat-body { height: 420px; overflow-y: auto; padding: 20px; background: #f9fbfe; }
        .bubble { max-width: 75%; padding: 10px 14px; border-radius: 16px; margin-bottom: 12px; display: inline-block; word-break: break-word; }
        .bubble-me { background: #0d6efd; color: white; margin-left: auto; border-bottom-right-radius: 4px; }
        .bubble-other { background: #e9ecef; color: #212529; border-bottom-left-radius: 4px; }
        .chat-footer { padding: 15px 20px; border-top: 1px solid #eee; background: white; }
      `}} />
      <div className="chat-card mt-3">
        <div className="chat-header">
          <h4 className="mb-1"><i className="fas fa-comments me-2"></i>Realtime Tracking Chat</h4>
          <small>Ticket #{ticket_id} — {ticket?.judul || 'Laporan'}</small>
        </div>

        <div className="chat-body">
          {messages.length === 0 ? (
            <div className="text-muted text-center pt-4">Belum ada pesan. Mulai percakapan...</div>
          ) : (
            messages.map((msg, idx) => {
              const isMine = msg.sender_id === user.user_id;
              return (
                <div key={idx} className={`d-flex ${isMine ? 'justify-content-end' : 'justify-content-start'}`}>
                  <div className={`bubble ${isMine ? 'bubble-me' : 'bubble-other'}`}>
                    {!isMine && <div className="small fw-semibold mb-1 opacity-75">{msg.sender_name}</div>}
                    <div>{msg.message}</div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-footer">
          <form onSubmit={sendMessage}>
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                placeholder="Ketik pesan..."
                autoComplete="off"
                required
                value={input}
                onChange={e => setInput(e.target.value)}
              />
              <button className="btn btn-primary" type="submit">
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

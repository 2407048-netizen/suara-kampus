'use client';

import { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BottomNav from '@/components/BottomNav';
import Pusher from 'pusher-js';

export default function ChatClient({ user }: { user: any }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Fetch initial history
    fetch('/api/chat')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMessages(data.messages);
        }
      });

    // Pusher Subscribe
    if (process.env.NEXT_PUBLIC_PUSHER_KEY) {
      Pusher.logToConsole = false;
      const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap1',
      });
      const channel = pusher.subscribe('suara-kampus-chat');
      channel.bind('new-message', (data: any) => {
        setMessages(prev => [...prev, data]);
      });

      return () => {
        pusher.unsubscribe('suara-kampus-chat');
      };
    } else {
      // Fallback to polling if pusher is not configured
      const interval = setInterval(() => {
        fetch('/api/chat')
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setMessages(data.messages);
            }
          });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const msg = input;
    setInput('');

    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg })
    });
  };

  return (
    <>
      <Navbar user={user} />
      <div className="container mt-4 mb-5" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <div className="card shadow-sm border-0 rounded-4" style={{ height: '75vh', display: 'flex', flexDirection: 'column' }}>
          <div className="card-header bg-white border-0 pt-4 pb-2 px-4 d-flex align-items-center">
            <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '45px', height: '45px' }}>
              <i className="fas fa-comments fs-5"></i>
            </div>
            <div>
              <h4 className="fw-bold text-dark mb-0">Live Chat Bantuan</h4>
              <p className="text-muted small mb-0">Tanyakan masalah Anda langsung ke admin.</p>
            </div>
          </div>
          
          <div className="card-body p-4 overflow-auto" style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
            {messages.map((msg, idx) => (
              <div key={idx} className={`d-flex mb-3 ${msg.user_id === user.user_id ? 'justify-content-end' : 'justify-content-start'}`}>
                {msg.user_id !== user.user_id && (
                  <div className="me-2">
                    <div className={`rounded-circle d-flex align-items-center justify-content-center text-white ${msg.is_admin ? 'bg-danger' : 'bg-secondary'}`} style={{ width: '35px', height: '35px', fontSize: '12px' }}>
                      {msg.is_admin ? 'A' : msg.sender_name?.charAt(0) || 'U'}
                    </div>
                  </div>
                )}
                <div style={{ maxWidth: '75%' }}>
                  <div className={`p-3 rounded-4 ${msg.user_id === user.user_id ? 'bg-primary text-white' : 'bg-white border'}`}>
                    <div className="fw-bold small mb-1" style={{ opacity: 0.8 }}>
                      {msg.sender_name} {msg.is_admin ? <i className="fas fa-check-circle text-warning ms-1" title="Admin"></i> : ''}
                    </div>
                    <div style={{ wordBreak: 'break-word' }}>{msg.message}</div>
                  </div>
                  <div className={`small text-muted mt-1 ${msg.user_id === user.user_id ? 'text-end' : ''}`} style={{ fontSize: '10px' }}>
                    {new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="card-footer bg-white border-0 p-3">
            <form onSubmit={sendMessage} className="d-flex gap-2">
              <input 
                type="text" 
                className="form-control rounded-pill px-4" 
                placeholder="Ketik pesan Anda..." 
                value={input}
                onChange={e => setInput(e.target.value)}
              />
              <button type="submit" className="btn btn-primary rounded-pill px-4">
                <i className="fas fa-paper-plane"></i>
              </button>
            </form>
          </div>
        </div>
      </div>
      <BottomNav user={user} />
      <Footer />
    </>
  );
}

'use client';

import { useState } from 'react';
import { siteConfig } from '@/lib/site.config';

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;
    const subject = encodeURIComponent(`[网站留言] ${form.name}`);
    const body = encodeURIComponent(`${form.message}\n\n—— ${form.name} (${form.email})`);
    window.location.href = `mailto:${siteConfig.contact.editorEmail}?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <div className="border" style={{ borderColor: 'var(--c-border)' }}>
      <div className="flex items-center gap-2 px-5 py-3.5 border-b" style={{ borderColor: 'var(--c-border)' }}>
        <span className="w-[7px] h-[18px]" style={{ backgroundColor: 'var(--c-accent)' }} />
        <h2 className="text-lg font-black" style={{ color: '#000' }}>发送消息</h2>
        <span className="text-[10px] font-bold pt-px" style={{ color: '#999', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}>MESSAGE</span>
      </div>

      {sent && (
        <div className="px-5 py-3 border-b text-sm font-medium" style={{ borderColor: 'var(--c-border)', backgroundColor: '#fffbe6', color: '#000' }}>
          已为你打开邮件客户端，点击发送即可完成投递。
        </div>
      )}

      <form className="p-5 space-y-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: '#000' }}>姓名</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              required placeholder="您的姓名"
              className="w-full px-3.5 py-2.5 text-sm border outline-none transition-colors focus:border-[var(--c-accent)]"
              style={{ borderColor: 'var(--c-border)', backgroundColor: '#fff', color: '#000' }} />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: '#000' }}>邮箱</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              required placeholder="your@email.com"
              className="w-full px-3.5 py-2.5 text-sm border outline-none transition-colors focus:border-[var(--c-accent)]"
              style={{ borderColor: 'var(--c-border)', backgroundColor: '#fff', color: '#000' }} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold mb-2" style={{ color: '#000' }}>消息</label>
          <textarea rows={5} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
            required placeholder="请输入您的消息..."
            className="w-full px-3.5 py-2.5 text-sm border outline-none transition-colors focus:border-black resize-none"
            style={{ borderColor: 'var(--c-border)', backgroundColor: '#fff', color: '#000' }} />
        </div>
        <button type="submit"
          className="px-7 py-2.5 text-sm font-black transition-all bg-gold-grad text-black hover:bg-black hover:text-[var(--c-accent)] border border-transparent hover:border-[var(--c-accent)]">
          发送消息 →
        </button>
      </form>
    </div>
  );
}

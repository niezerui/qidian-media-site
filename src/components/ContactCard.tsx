/**
 * 联系我们模块 — 与快讯/热门标签统一的侧栏模块语言
 * 黑色顶线 + 金色小条标题 + 灰色内容区 + 白色内衬二维码
 */
export default function ContactCard() {
  return (
    <div className="border-b" style={{ borderTop: '2px solid #000000', borderBottomColor: '#efefef' }}>
      {/* 标题栏（灰底） */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #efefef', backgroundColor: 'var(--c-surface)' }}>
        <div className="flex items-center gap-2">
          <span className="w-[7px] h-[16px]" style={{ backgroundColor: 'var(--c-accent-bright)' }} />
          <h3 className="text-base font-black" style={{ color: '#000000' }}>联系我们</h3>
        </div>
        <span className="text-[10px] font-bold pt-px" style={{ color: 'var(--c-text-3)', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}>
          CONTACT
        </span>
      </div>
      {/* 内容（灰底） */}
      <div className="px-6 py-7 text-center" style={{ backgroundColor: 'var(--c-surface)' }}>
        <div className="inline-block bg-white p-2 shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
          <img
            src="/images/qrcode-contact.png"
            alt="联系我们"
            className="w-[124px] h-[124px] block"
          />
        </div>
        <p className="text-sm font-bold mt-4 mb-1" style={{ color: '#000000' }}>扫码添加微信</p>
        <p className="text-xs font-medium" style={{ color: '#4a4a4a', fontFamily: 'var(--font-mono)', letterSpacing: '0.12em' }}>合作 · 投稿 · 交流</p>
      </div>
    </div>
  );
}

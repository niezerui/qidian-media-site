import { ReactNode } from 'react';

/**
 * 编辑部式板块标题
 * 黄色小方块 + 中文主标题 + 英文小字 + 延伸细线 [+ 右侧自定义]
 */
export default function SectionHeading({
  zh,
  en,
  trailing,
  className = '',
}: {
  zh: string;
  en?: string;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* 金色方块（直角，品牌强调色渐变） */}
      <span className="w-[7px] h-[18px] flex-shrink-0 bg-gold-grad" />
      <h2 className="text-lg lg:text-xl font-black whitespace-nowrap" style={{ color: '#000000', letterSpacing: '0.02em' }}>
        {zh}
      </h2>
      {en && (
        <span className="hidden sm:inline text-[10px] font-bold whitespace-nowrap pt-[3px] text-gold-grad"
          style={{ letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
          {en}
        </span>
      )}
      {/* 延伸细线（金色渐变） */}
      <div className="flex-1 h-px line-gold-grad" />
      {trailing}
    </div>
  );
}

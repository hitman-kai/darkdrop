'use client';

interface TgHeaderProps {
  title?: string;
  subtitle?: string;
}

export function TgHeader({ 
  title = 'DARKDROP',
  subtitle = 'Private Drops on Solana'
}: TgHeaderProps) {
  return (
    <header className="tg-header">
      <div className="tg-header-logo">🌑</div>
      <h1 className="tg-header-title">{title}</h1>
      {subtitle && <p className="tg-header-subtitle">{subtitle}</p>}
    </header>
  );
}


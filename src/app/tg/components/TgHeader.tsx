'use client';

interface TgHeaderProps {
  tag?: string;
  title?: string;
  subtitle?: string;
}

export function TgHeader({ 
  tag = 'DARKDROP',
  title,
  subtitle
}: TgHeaderProps) {
  return (
    <header className="tg-header">
      <p className="tg-header-tag">{tag}</p>
      {title && <h1 className="tg-header-title">{title}</h1>}
      {subtitle && <p className="tg-header-subtitle">{subtitle}</p>}
    </header>
  );
}

'use client';

interface TgCardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  onClick?: () => void;
}

export function TgCard({ children, title, className = '', onClick }: TgCardProps) {
  return (
    <div 
      className={`tg-card ${className}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      {title && <h3 className="tg-card-title">{title}</h3>}
      {children}
    </div>
  );
}


'use client';

import { useTelegram } from './TelegramProvider';

interface TgButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function TgButton({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  loading = false,
  className = '',
}: TgButtonProps) {
  const { haptic } = useTelegram();

  const handleClick = () => {
    if (disabled || loading) return;
    haptic('light');
    onClick?.();
  };

  return (
    <button
      className={`tg-button tg-button-${variant} ${className}`}
      onClick={handleClick}
      disabled={disabled || loading}
    >
      {loading && <span className="tg-spinner" />}
      {children}
    </button>
  );
}


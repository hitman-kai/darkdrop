'use client';

import { useRouter } from 'next/navigation';
import { useTelegram, TgHeader, TgButton } from './components';
import { useEffect } from 'react';

export default function TelegramHomePage() {
  const router = useRouter();
  const { user, startParam, isTelegram, haptic } = useTelegram();

  // If opened with a claim code as start_param, redirect to claim
  useEffect(() => {
    if (startParam && startParam.startsWith('claim_')) {
      const code = startParam.replace('claim_', '');
      router.push(`/tg/claim?code=${encodeURIComponent(code)}`);
    }
  }, [startParam, router]);

  const handleNavigate = (path: string) => {
    haptic('light');
    router.push(path);
  };

  return (
    <div className="tg-fade-in">
      <TgHeader 
        title="ANONYMOUS SOLANA DEAD DROPS"
        subtitle={user ? `Welcome, ${user.first_name}` : 'No addresses shared. No traceable links.'}
      />

      <div className="tg-container">
        {/* Main Actions */}
        <div className="tg-mt-20">
          <div 
            className="tg-menu-item"
            onClick={() => handleNavigate('/tg/drop')}
          >
            <div className="tg-menu-item-content">
              <span className="tg-menu-item-title">CREATE DROP</span>
              <span className="tg-menu-item-desc">Send SOL or USDC privately</span>
            </div>
            <span className="tg-menu-item-arrow">&gt;</span>
          </div>

          <div 
            className="tg-menu-item"
            onClick={() => handleNavigate('/tg/claim')}
          >
            <div className="tg-menu-item-content">
              <span className="tg-menu-item-title">CLAIM DROP</span>
              <span className="tg-menu-item-desc">Receive funds with a claim code</span>
            </div>
            <span className="tg-menu-item-arrow">&gt;</span>
          </div>
        </div>

        {/* Features */}
        <div className="tg-divider" />

        <p className="tg-label">FEATURES</p>

        <div className="tg-list">
          <div className="tg-list-item">
            <span className="tg-list-item-title">ZK COMPRESSION</span>
            <span className="tg-list-item-right">LIGHT PROTOCOL</span>
          </div>
          <div className="tg-list-item">
            <span className="tg-list-item-title">GASLESS CLAIMS</span>
            <span className="tg-list-item-right">RELAYER</span>
          </div>
          <div className="tg-list-item">
            <span className="tg-list-item-title">SHARE VIA TELEGRAM</span>
            <span className="tg-list-item-right">ENABLED</span>
          </div>
        </div>

        {/* Not in Telegram notice */}
        {!isTelegram && (
          <div className="tg-status tg-status-pending tg-mt-20">
            OPEN IN TELEGRAM FOR FULL EXPERIENCE
          </div>
        )}

        {/* Footer */}
        <div className="tg-footer">
          POWERED BY SOLANA
        </div>
      </div>
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useTelegram, TgHeader, TgButton, TgCard } from './components';
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
        subtitle={user ? `Welcome, ${user.first_name}` : 'Private Drops on Solana'}
      />

      <div className="tg-container">
        {/* Main Actions */}
        <div className="tg-mt-24">
          <TgCard onClick={() => handleNavigate('/tg/drop')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '32px' }}>📦</span>
              <div>
                <h3 className="tg-card-title" style={{ marginBottom: '4px' }}>Create Drop</h3>
                <p className="tg-card-desc">Send SOL or USDC privately</p>
              </div>
            </div>
          </TgCard>

          <TgCard onClick={() => handleNavigate('/tg/claim')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '32px' }}>🎁</span>
              <div>
                <h3 className="tg-card-title" style={{ marginBottom: '4px' }}>Claim Drop</h3>
                <p className="tg-card-desc">Receive funds with a claim code</p>
              </div>
            </div>
          </TgCard>
        </div>

        {/* Features */}
        <div className="tg-divider tg-mt-24" />

        <h2 style={{ 
          fontSize: '12px', 
          color: 'var(--tg-hint)', 
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '12px'
        }}>
          Features
        </h2>

        <div className="tg-list">
          <div className="tg-list-item">
            <div className="tg-list-item-left">
              <span className="tg-list-item-icon">🔐</span>
              <div>
                <div className="tg-list-item-title">ZK Privacy</div>
                <div className="tg-list-item-subtitle">Light Protocol compression</div>
              </div>
            </div>
          </div>

          <div className="tg-list-item">
            <div className="tg-list-item-left">
              <span className="tg-list-item-icon">⛽</span>
              <div>
                <div className="tg-list-item-title">Gasless Claims</div>
                <div className="tg-list-item-subtitle">Relayer pays the fees</div>
              </div>
            </div>
          </div>

          <div className="tg-list-item">
            <div className="tg-list-item-left">
              <span className="tg-list-item-icon">🔗</span>
              <div>
                <div className="tg-list-item-title">Share via Telegram</div>
                <div className="tg-list-item-subtitle">Send claims in chat</div>
              </div>
            </div>
          </div>
        </div>

        {/* Not in Telegram notice */}
        {!isTelegram && (
          <div className="tg-status tg-status-pending tg-mt-24">
            ⚠️ Open in Telegram for full experience
          </div>
        )}

        {/* Footer */}
        <div className="tg-mt-24" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '11px', color: 'var(--tg-hint)' }}>
            Powered by Solana & Light Protocol
          </p>
        </div>
      </div>
    </div>
  );
}


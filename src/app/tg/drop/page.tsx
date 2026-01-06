'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Keypair } from '@solana/web3.js';
import { useTelegram, TgHeader, TgButton, TgInput, TgCard, TgAssetSelect, Asset } from '../components';

// Claim code format: darkdrop_v2_<base58PrivateKey>
function encodeClaimCode(keypair: Keypair): string {
  const bs58 = require('bs58');
  return `darkdrop_v2_${bs58.default.encode(keypair.secretKey)}`;
}

export default function TelegramDropPage() {
  const router = useRouter();
  const { showBackButton, hideBackButton, showMainButton, hideMainButton, haptic, alert, isTelegram, webApp } = useTelegram();

  const [asset, setAsset] = useState<Asset>('SOL');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'input' | 'confirm' | 'sending' | 'success'>('input');
  const [claimCode, setClaimCode] = useState('');
  const [burnerAddress, setBurnerAddress] = useState('');
  const [error, setError] = useState('');

  // Back button
  useEffect(() => {
    if (step === 'input') {
      showBackButton(() => router.push('/tg'));
    } else if (step === 'confirm') {
      showBackButton(() => setStep('input'));
    } else {
      hideBackButton();
    }

    return () => hideBackButton();
  }, [step, router, showBackButton, hideBackButton]);

  // Main button for confirm step
  useEffect(() => {
    if (step === 'confirm') {
      showMainButton('Confirm & Send', handleConfirmSend);
    } else if (step === 'success') {
      showMainButton('Share via Telegram', handleShare);
    } else {
      hideMainButton();
    }

    return () => hideMainButton();
  }, [step]);

  const handleContinue = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      haptic('error');
      setError('Please enter a valid amount');
      return;
    }

    if (asset === 'SOL' && numAmount < 0.001) {
      haptic('error');
      setError('Minimum 0.001 SOL');
      return;
    }

    if (asset === 'USDC' && numAmount < 0.01) {
      haptic('error');
      setError('Minimum 0.01 USDC');
      return;
    }

    setError('');
    haptic('light');
    setStep('confirm');
  };

  const handleConfirmSend = async () => {
    setStep('sending');
    haptic('medium');

    try {
      // Generate burner keypair
      const burner = Keypair.generate();
      const code = encodeClaimCode(burner);

      setBurnerAddress(burner.publicKey.toBase58());
      setClaimCode(code);

      // For now, show success with the claim code
      // In production, this would trigger wallet signing
      // The user needs to connect their wallet and sign the transaction
      
      // Since we're in Telegram Mini App and can't directly access wallet adapters,
      // we'll need to either:
      // 1. Redirect to web app for wallet connection
      // 2. Use a custodial solution
      // 3. Use Telegram's TON wallet integration (future)
      
      // For now, show the burner address for manual transfer
      setStep('success');
      haptic('success');

    } catch (err) {
      console.error('Drop creation error:', err);
      setError('Failed to create drop');
      setStep('confirm');
      haptic('error');
    }
  };

  const handleShare = () => {
    haptic('light');
    
    const shareText = `🌑 DarkDrop\n\nYou received ${amount} ${asset}!\n\nClaim here: https://darkdrop.app/tg/claim?code=${encodeURIComponent(claimCode)}`;
    
    if (webApp) {
      // Open Telegram share dialog
      const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(`https://darkdrop.app/tg/claim?code=${claimCode}`)}&text=${encodeURIComponent(`🌑 You received ${amount} ${asset} via DarkDrop!`)}`;
      webApp.openTelegramLink(telegramUrl);
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(claimCode);
      alert('Claim code copied!');
    }
  };

  const handleCopyCode = () => {
    haptic('light');
    navigator.clipboard.writeText(claimCode);
    alert('Claim code copied!');
  };

  // Input step
  if (step === 'input') {
    return (
      <div className="tg-fade-in">
        <TgHeader title="CREATE DROP" subtitle="Send privately" />

        <div className="tg-container">
          <TgAssetSelect value={asset} onChange={setAsset} />

          <div className="tg-mt-16">
            <label style={{ 
              display: 'block', 
              fontSize: '12px', 
              color: 'var(--tg-hint)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Amount
            </label>
            <TgInput
              type="number"
              value={amount}
              onChange={setAmount}
              placeholder={asset === 'SOL' ? '0.00 SOL' : '0.00 USDC'}
            />
          </div>

          {error && (
            <div className="tg-status tg-status-error tg-mt-12">
              {error}
            </div>
          )}

          <div className="tg-mt-24">
            <TgButton onClick={handleContinue} disabled={!amount}>
              Continue
            </TgButton>
          </div>

          <TgCard className="tg-mt-24">
            <p className="tg-card-desc">
              💡 Creates a burner wallet. Send funds there, then share the claim code.
            </p>
          </TgCard>
        </div>
      </div>
    );
  }

  // Confirm step
  if (step === 'confirm') {
    return (
      <div className="tg-fade-in">
        <TgHeader title="CONFIRM DROP" subtitle="Review before sending" />

        <div className="tg-container">
          <div className="tg-amount">
            <div className="tg-amount-value">
              {amount} {asset}
            </div>
            <div className="tg-amount-label">
              Will be sent to burner wallet
            </div>
          </div>

          <div className="tg-list">
            <div className="tg-list-item">
              <div className="tg-list-item-left">
                <span className="tg-list-item-icon">🔐</span>
                <span className="tg-list-item-title">ZK Compressed</span>
              </div>
              <span className="tg-list-item-right">Yes</span>
            </div>
            <div className="tg-list-item">
              <div className="tg-list-item-left">
                <span className="tg-list-item-icon">⛽</span>
                <span className="tg-list-item-title">Recipient pays gas</span>
              </div>
              <span className="tg-list-item-right">No (Relayer)</span>
            </div>
          </div>

          <div className="tg-mt-24">
            <TgButton onClick={handleConfirmSend}>
              Create Drop
            </TgButton>
          </div>
        </div>
      </div>
    );
  }

  // Sending step
  if (step === 'sending') {
    return (
      <div className="tg-fade-in">
        <TgHeader title="CREATING..." subtitle="Please wait" />

        <div className="tg-container" style={{ textAlign: 'center', paddingTop: '48px' }}>
          <div className="tg-spinner" style={{ 
            width: '48px', 
            height: '48px',
            margin: '0 auto',
            borderWidth: '3px'
          }} />
          <p className="tg-mt-24" style={{ color: 'var(--tg-hint)' }}>
            Generating burner wallet...
          </p>
        </div>
      </div>
    );
  }

  // Success step
  return (
    <div className="tg-fade-in">
      <TgHeader title="DROP CREATED!" subtitle="Share the claim code" />

      <div className="tg-container">
        <div className="tg-status tg-status-success tg-mb-16">
          ✓ Burner wallet generated
        </div>

        <div className="tg-amount">
          <div className="tg-amount-value">
            {amount} {asset}
          </div>
          <div className="tg-amount-label">
            Send to burner, then share code
          </div>
        </div>

        {/* Burner Address */}
        <TgCard title="Burner Address">
          <p style={{ 
            fontFamily: 'monospace', 
            fontSize: '11px',
            wordBreak: 'break-all',
            color: 'var(--tg-text)'
          }}>
            {burnerAddress}
          </p>
          <TgButton 
            variant="secondary" 
            className="tg-mt-12"
            onClick={() => {
              haptic('light');
              navigator.clipboard.writeText(burnerAddress);
              alert('Address copied!');
            }}
          >
            Copy Address
          </TgButton>
        </TgCard>

        {/* Claim Code */}
        <TgCard title="Claim Code (Keep Secret!)">
          <div className="tg-code">
            <p className="tg-code-value">{claimCode}</p>
          </div>
          <TgButton variant="secondary" onClick={handleCopyCode}>
            Copy Code
          </TgButton>
        </TgCard>

        <div className="tg-mt-16">
          <TgButton onClick={handleShare}>
            📤 Share via Telegram
          </TgButton>
        </div>

        <TgButton 
          variant="ghost" 
          className="tg-mt-12"
          onClick={() => router.push('/tg')}
        >
          Done
        </TgButton>
      </div>
    </div>
  );
}


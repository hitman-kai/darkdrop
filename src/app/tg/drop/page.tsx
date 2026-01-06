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
  const { showBackButton, hideBackButton, showMainButton, hideMainButton, haptic, alert, webApp } = useTelegram();

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
      showMainButton('CONFIRM & SEND', handleConfirmSend);
    } else if (step === 'success') {
      showMainButton('SHARE VIA TELEGRAM', handleShare);
    } else {
      hideMainButton();
    }

    return () => hideMainButton();
  }, [step]);

  const handleContinue = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      haptic('error');
      setError('ENTER A VALID AMOUNT');
      return;
    }

    if (asset === 'SOL' && numAmount < 0.001) {
      haptic('error');
      setError('MINIMUM 0.001 SOL');
      return;
    }

    if (asset === 'USDC' && numAmount < 0.01) {
      haptic('error');
      setError('MINIMUM 0.01 USDC');
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
      const burner = Keypair.generate();
      const code = encodeClaimCode(burner);

      setBurnerAddress(burner.publicKey.toBase58());
      setClaimCode(code);
      setStep('success');
      haptic('success');

    } catch (err) {
      console.error('Drop creation error:', err);
      setError('FAILED TO CREATE DROP');
      setStep('confirm');
      haptic('error');
    }
  };

  const handleShare = () => {
    haptic('light');
    
    if (webApp) {
      const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(`https://darkdrop.app/tg/claim?code=${claimCode}`)}&text=${encodeURIComponent(`You received ${amount} ${asset} via DarkDrop`)}`;
      webApp.openTelegramLink(telegramUrl);
    } else {
      navigator.clipboard.writeText(claimCode);
      alert('Claim code copied');
    }
  };

  const handleCopyCode = () => {
    haptic('light');
    navigator.clipboard.writeText(claimCode);
    alert('Claim code copied');
  };

  const handleCopyAddress = () => {
    haptic('light');
    navigator.clipboard.writeText(burnerAddress);
    alert('Address copied');
  };

  // Input step
  if (step === 'input') {
    return (
      <div className="tg-fade-in">
        <TgHeader title="CREATE DROP" subtitle="Send privately" />

        <div className="tg-container">
          <TgAssetSelect value={asset} onChange={setAsset} />

          <div className="tg-mt-16">
            <label className="tg-label">AMOUNT</label>
            <TgInput
              type="number"
              value={amount}
              onChange={setAmount}
              placeholder={asset === 'SOL' ? '0.00' : '0.00'}
            />
          </div>

          {error && (
            <div className="tg-status tg-status-error tg-mt-12">
              {error}
            </div>
          )}

          <div className="tg-mt-24">
            <TgButton onClick={handleContinue} disabled={!amount}>
              CONTINUE
            </TgButton>
          </div>

          <TgCard className="tg-mt-24">
            <p className="tg-card-desc">
              Creates a burner wallet. Send funds there, then share the claim code.
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
              WILL BE SENT TO BURNER WALLET
            </div>
          </div>

          <div className="tg-list">
            <div className="tg-list-item">
              <span className="tg-list-item-title">ZK COMPRESSED</span>
              <span className="tg-list-item-right">YES</span>
            </div>
            <div className="tg-list-item">
              <span className="tg-list-item-title">RECIPIENT PAYS GAS</span>
              <span className="tg-list-item-right">NO</span>
            </div>
          </div>

          <div className="tg-mt-24">
            <TgButton onClick={handleConfirmSend}>
              CREATE DROP
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
        <TgHeader title="CREATING" subtitle="Please wait" />

        <div className="tg-container" style={{ textAlign: 'center', paddingTop: '48px' }}>
          <div className="tg-spinner" style={{ 
            width: '32px', 
            height: '32px',
            margin: '0 auto',
            borderWidth: '2px'
          }} />
          <p className="tg-mt-24" style={{ color: 'var(--tg-muted)', fontSize: '11px', letterSpacing: '0.1em' }}>
            GENERATING BURNER WALLET
          </p>
        </div>
      </div>
    );
  }

  // Success step
  return (
    <div className="tg-fade-in">
      <TgHeader title="DROP CREATED" subtitle="Share the claim code" />

      <div className="tg-container">
        <div className="tg-status tg-status-success tg-mb-16">
          BURNER WALLET GENERATED
        </div>

        <div className="tg-amount">
          <div className="tg-amount-value">
            {amount} {asset}
          </div>
          <div className="tg-amount-label">
            SEND TO BURNER, THEN SHARE CODE
          </div>
        </div>

        {/* Burner Address */}
        <TgCard title="BURNER ADDRESS">
          <p style={{ 
            fontSize: '10px',
            wordBreak: 'break-all',
            color: 'var(--tg-text)',
            lineHeight: '1.6'
          }}>
            {burnerAddress}
          </p>
          <TgButton 
            variant="secondary" 
            className="tg-mt-12"
            onClick={handleCopyAddress}
          >
            COPY ADDRESS
          </TgButton>
        </TgCard>

        {/* Claim Code */}
        <TgCard title="CLAIM CODE">
          <div className="tg-code">
            <p className="tg-code-value">{claimCode}</p>
          </div>
          <TgButton variant="secondary" onClick={handleCopyCode}>
            COPY CODE
          </TgButton>
        </TgCard>

        <div className="tg-mt-16">
          <TgButton onClick={handleShare}>
            SHARE VIA TELEGRAM
          </TgButton>
        </div>

        <TgButton 
          variant="ghost" 
          className="tg-mt-12"
          onClick={() => router.push('/tg')}
        >
          DONE
        </TgButton>
      </div>
    </div>
  );
}

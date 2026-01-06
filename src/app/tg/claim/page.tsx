'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTelegram, TgHeader, TgButton, TgInput, TgCard } from '../components';

function ClaimContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showBackButton, hideBackButton, haptic, alert, isTelegram } = useTelegram();

  const [claimCode, setClaimCode] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [step, setStep] = useState<'input' | 'claiming' | 'success' | 'error'>('input');
  const [error, setError] = useState('');
  const [claimedAmount, setClaimedAmount] = useState('');
  const [claimedAsset, setClaimedAsset] = useState('');
  const [txSignature, setTxSignature] = useState('');

  // Pre-fill from URL param
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setClaimCode(code);
    }
  }, [searchParams]);

  // Back button
  useEffect(() => {
    if (step === 'input') {
      showBackButton(() => router.push('/tg'));
    } else {
      hideBackButton();
    }

    return () => hideBackButton();
  }, [step, router, showBackButton, hideBackButton]);

  const validateClaimCode = (code: string): boolean => {
    return code.startsWith('darkdrop_v2_') || code.startsWith('darkdrop_v1_');
  };

  const validateSolanaAddress = (address: string): boolean => {
    // Basic Solana address validation (32-44 chars, base58)
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  };

  const handleClaim = async () => {
    // Validate inputs
    if (!validateClaimCode(claimCode)) {
      haptic('error');
      setError('Invalid claim code format');
      return;
    }

    if (!validateSolanaAddress(destinationAddress)) {
      haptic('error');
      setError('Invalid Solana wallet address');
      return;
    }

    setError('');
    setStep('claiming');
    haptic('medium');

    try {
      // Call the relayer API to claim
      const response = await fetch('/api/relay/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimCode,
          destination: destinationAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Claim failed');
      }

      setClaimedAmount(data.amount || '?');
      setClaimedAsset(data.asset || 'tokens');
      setTxSignature(data.signature || '');
      setStep('success');
      haptic('success');

    } catch (err) {
      console.error('Claim error:', err);
      setError(err instanceof Error ? err.message : 'Claim failed');
      setStep('error');
      haptic('error');
    }
  };

  const handleViewTransaction = () => {
    if (txSignature) {
      window.open(`https://solscan.io/tx/${txSignature}`, '_blank');
    }
  };

  // Input step
  if (step === 'input') {
    return (
      <div className="tg-fade-in">
        <TgHeader title="CLAIM DROP" subtitle="Enter code to receive funds" />

        <div className="tg-container">
          {/* Claim Code Input */}
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '12px', 
              color: 'var(--tg-hint)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Claim Code
            </label>
            <TgInput
              value={claimCode}
              onChange={setClaimCode}
              placeholder="darkdrop_v2_..."
            />
          </div>

          {/* Destination Address Input */}
          <div className="tg-mt-16">
            <label style={{ 
              display: 'block', 
              fontSize: '12px', 
              color: 'var(--tg-hint)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Your Wallet Address
            </label>
            <TgInput
              value={destinationAddress}
              onChange={setDestinationAddress}
              placeholder="Your Solana address..."
            />
          </div>

          {error && (
            <div className="tg-status tg-status-error tg-mt-12">
              {error}
            </div>
          )}

          <div className="tg-mt-24">
            <TgButton 
              onClick={handleClaim} 
              disabled={!claimCode || !destinationAddress}
            >
              🎁 Claim via Relayer
            </TgButton>
          </div>

          <TgCard className="tg-mt-24">
            <div className="tg-list">
              <div className="tg-list-item" style={{ background: 'transparent', padding: '8px 0' }}>
                <div className="tg-list-item-left">
                  <span className="tg-list-item-icon">⛽</span>
                  <span className="tg-list-item-title">No gas needed</span>
                </div>
              </div>
              <div className="tg-list-item" style={{ background: 'transparent', padding: '8px 0' }}>
                <div className="tg-list-item-left">
                  <span className="tg-list-item-icon">💰</span>
                  <span className="tg-list-item-title">1% relayer fee</span>
                </div>
              </div>
              <div className="tg-list-item" style={{ background: 'transparent', padding: '8px 0' }}>
                <div className="tg-list-item-left">
                  <span className="tg-list-item-icon">🔐</span>
                  <span className="tg-list-item-title">No wallet connection</span>
                </div>
              </div>
            </div>
          </TgCard>
        </div>
      </div>
    );
  }

  // Claiming step
  if (step === 'claiming') {
    return (
      <div className="tg-fade-in">
        <TgHeader title="CLAIMING..." subtitle="Please wait" />

        <div className="tg-container" style={{ textAlign: 'center', paddingTop: '48px' }}>
          <div className="tg-spinner" style={{ 
            width: '48px', 
            height: '48px',
            margin: '0 auto',
            borderWidth: '3px'
          }} />
          <p className="tg-mt-24" style={{ color: 'var(--tg-hint)' }}>
            Relayer is processing your claim...
          </p>
          <p className="tg-mt-8" style={{ color: 'var(--tg-hint)', fontSize: '12px' }}>
            This may take a few seconds
          </p>
        </div>
      </div>
    );
  }

  // Success step
  if (step === 'success') {
    return (
      <div className="tg-fade-in">
        <TgHeader title="CLAIMED!" subtitle="Funds are on the way" />

        <div className="tg-container">
          <div className="tg-status tg-status-success tg-mb-16">
            ✓ Successfully claimed!
          </div>

          <div className="tg-amount">
            <div className="tg-amount-value">
              {claimedAmount} {claimedAsset}
            </div>
            <div className="tg-amount-label">
              Sent to your wallet
            </div>
          </div>

          {txSignature && (
            <TgCard className="tg-mt-16">
              <p className="tg-card-desc" style={{ marginBottom: '12px' }}>
                Transaction confirmed on Solana
              </p>
              <TgButton variant="secondary" onClick={handleViewTransaction}>
                View on Solscan →
              </TgButton>
            </TgCard>
          )}

          <div className="tg-mt-24">
            <TgButton onClick={() => router.push('/tg')}>
              Done
            </TgButton>
          </div>
        </div>
      </div>
    );
  }

  // Error step
  return (
    <div className="tg-fade-in">
      <TgHeader title="CLAIM FAILED" subtitle="Something went wrong" />

      <div className="tg-container">
        <div className="tg-status tg-status-error tg-mb-16">
          ✕ {error || 'Unknown error'}
        </div>

        <TgCard>
          <p className="tg-card-desc">
            This could happen if:
          </p>
          <ul style={{ 
            margin: '12px 0 0 0', 
            paddingLeft: '20px',
            color: 'var(--tg-hint)',
            fontSize: '13px'
          }}>
            <li>The drop was already claimed</li>
            <li>The claim code is invalid</li>
            <li>The burner wallet is empty</li>
            <li>Network issues</li>
          </ul>
        </TgCard>

        <div className="tg-mt-24">
          <TgButton onClick={() => setStep('input')}>
            Try Again
          </TgButton>
        </div>

        <TgButton 
          variant="ghost" 
          className="tg-mt-12"
          onClick={() => router.push('/tg')}
        >
          Go Home
        </TgButton>
      </div>
    </div>
  );
}

export default function TelegramClaimPage() {
  return (
    <Suspense fallback={
      <div className="tg-app" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '100vh'
      }}>
        <div className="tg-spinner" />
      </div>
    }>
      <ClaimContent />
    </Suspense>
  );
}


'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTelegram, TgHeader, TgButton, TgInput, TgCard } from '../components';

function ClaimContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showBackButton, hideBackButton, haptic, alert } = useTelegram();

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
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  };

  const handleClaim = async () => {
    if (!validateClaimCode(claimCode)) {
      haptic('error');
      setError('INVALID CLAIM CODE FORMAT');
      return;
    }

    if (!validateSolanaAddress(destinationAddress)) {
      haptic('error');
      setError('INVALID SOLANA WALLET ADDRESS');
      return;
    }

    setError('');
    setStep('claiming');
    haptic('medium');

    try {
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
      setClaimedAsset(data.asset || 'TOKENS');
      setTxSignature(data.signature || '');
      setStep('success');
      haptic('success');

    } catch (err) {
      console.error('Claim error:', err);
      setError(err instanceof Error ? err.message.toUpperCase() : 'CLAIM FAILED');
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
          <div>
            <label className="tg-label">CLAIM CODE</label>
            <TgInput
              value={claimCode}
              onChange={setClaimCode}
              placeholder="darkdrop_v2_..."
            />
          </div>

          <div className="tg-mt-16">
            <label className="tg-label">YOUR WALLET ADDRESS</label>
            <TgInput
              value={destinationAddress}
              onChange={setDestinationAddress}
              placeholder="Your Solana address"
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
              CLAIM VIA RELAYER
            </TgButton>
          </div>

          <TgCard className="tg-mt-24">
            <div className="tg-list" style={{ border: 'none', background: 'transparent' }}>
              <div className="tg-list-item" style={{ background: 'transparent', padding: '8px 0' }}>
                <span className="tg-list-item-title">NO GAS NEEDED</span>
              </div>
              <div className="tg-list-item" style={{ background: 'transparent', padding: '8px 0' }}>
                <span className="tg-list-item-title">1% RELAYER FEE</span>
              </div>
              <div className="tg-list-item" style={{ background: 'transparent', padding: '8px 0' }}>
                <span className="tg-list-item-title">NO WALLET CONNECTION</span>
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
        <TgHeader title="CLAIMING" subtitle="Please wait" />

        <div className="tg-container" style={{ textAlign: 'center', paddingTop: '48px' }}>
          <div className="tg-spinner" style={{ 
            width: '32px', 
            height: '32px',
            margin: '0 auto',
            borderWidth: '2px'
          }} />
          <p className="tg-mt-24" style={{ color: 'var(--tg-muted)', fontSize: '11px', letterSpacing: '0.1em' }}>
            RELAYER IS PROCESSING YOUR CLAIM
          </p>
          <p className="tg-mt-8" style={{ color: 'var(--tg-muted)', fontSize: '10px' }}>
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
        <TgHeader title="CLAIMED" subtitle="Funds are on the way" />

        <div className="tg-container">
          <div className="tg-status tg-status-success tg-mb-16">
            SUCCESSFULLY CLAIMED
          </div>

          <div className="tg-amount">
            <div className="tg-amount-value">
              {claimedAmount} {claimedAsset}
            </div>
            <div className="tg-amount-label">
              SENT TO YOUR WALLET
            </div>
          </div>

          {txSignature && (
            <TgCard className="tg-mt-16">
              <p className="tg-card-desc" style={{ marginBottom: '12px' }}>
                Transaction confirmed on Solana
              </p>
              <TgButton variant="secondary" onClick={handleViewTransaction}>
                VIEW ON SOLSCAN
              </TgButton>
            </TgCard>
          )}

          <div className="tg-mt-24">
            <TgButton onClick={() => router.push('/tg')}>
              DONE
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
          {error || 'UNKNOWN ERROR'}
        </div>

        <TgCard>
          <p className="tg-card-desc">
            This could happen if the drop was already claimed, the claim code is invalid, the burner wallet is empty, or there are network issues.
          </p>
        </TgCard>

        <div className="tg-mt-24">
          <TgButton onClick={() => setStep('input')}>
            TRY AGAIN
          </TgButton>
        </div>

        <TgButton 
          variant="ghost" 
          className="tg-mt-12"
          onClick={() => router.push('/tg')}
        >
          GO HOME
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
        <div className="tg-spinner" style={{ width: '24px', height: '24px' }} />
      </div>
    }>
      <ClaimContent />
    </Suspense>
  );
}

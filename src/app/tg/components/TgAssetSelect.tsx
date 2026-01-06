'use client';

import { useTelegram } from './TelegramProvider';

export type Asset = 'SOL' | 'USDC';

interface TgAssetSelectProps {
  value: Asset;
  onChange: (asset: Asset) => void;
}

const ASSETS: { id: Asset; icon: string; label: string }[] = [
  { id: 'SOL', icon: '◎', label: 'SOL' },
  { id: 'USDC', icon: '💵', label: 'USDC' },
];

export function TgAssetSelect({ value, onChange }: TgAssetSelectProps) {
  const { haptic } = useTelegram();

  const handleSelect = (asset: Asset) => {
    haptic('light');
    onChange(asset);
  };

  return (
    <div className="tg-select">
      {ASSETS.map((asset) => (
        <button
          key={asset.id}
          className={`tg-select-option ${value === asset.id ? 'active' : ''}`}
          onClick={() => handleSelect(asset.id)}
        >
          <div className="tg-select-option-icon">{asset.icon}</div>
          <div className="tg-select-option-label">{asset.label}</div>
        </button>
      ))}
    </div>
  );
}


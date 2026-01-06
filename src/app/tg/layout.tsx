'use client';

import Script from 'next/script';
import { TelegramProvider } from './components/TelegramProvider';
import './tg.css';

export default function TelegramLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Telegram Web App SDK */}
      <Script 
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      <TelegramProvider>
        <div className="tg-app">
          {children}
        </div>
      </TelegramProvider>
    </>
  );
}


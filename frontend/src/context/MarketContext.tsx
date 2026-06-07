'use client';
import React, { createContext, useContext, useState } from 'react';
import { useMarketStream } from '@/lib/useMarketStream';

interface MarketContextType {
  activeSymbol: string;
  setActiveSymbol: (symbol: string) => void;
  price: number | null;
  prevPrice: number | null;
  direction: 'up' | 'down' | 'neutral';
  isConnected: boolean;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [activeSymbol, setActiveSymbol] = useState('BINANCE:BTCUSDT');
  const marketData = useMarketStream(activeSymbol);

  return (
    <MarketContext.Provider value={{ activeSymbol, setActiveSymbol, ...marketData }}>
      {children}
    </MarketContext.Provider>
  );
}

export function useMarket() {
  const context = useContext(MarketContext);
  if (context === undefined) {
    throw new Error('useMarket must be used within a MarketProvider');
  }
  return context;
}

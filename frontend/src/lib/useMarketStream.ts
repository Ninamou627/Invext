import { useEffect, useState, useRef } from 'react';

export interface MarketTick {
  p: number; // Price
  s: string; // Symbol
  t: number; // Timestamp
  v: number; // Volume
}

const getWebSocketUrl = () => {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api';
  const backendUrl = new URL(apiUrl);
  backendUrl.pathname = backendUrl.pathname.replace(/\/api\/?$/, '');
  backendUrl.protocol = backendUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  return backendUrl.toString();
};

export function useMarketStream(symbol: string) {
  const [price, setPrice] = useState<number | null>(null);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [direction, setDirection] = useState<'up' | 'down' | 'neutral'>('neutral');
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // We only connect once this hook mounts
  useEffect(() => {
    if (!symbol) return;

    setPrice(null);
    setPrevPrice(null);
    setDirection('neutral');

    const ws = new WebSocket(getWebSocketUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Automatically subscribe to the requested symbol
      ws.send(JSON.stringify({ type: 'subscribe', symbol: symbol.toUpperCase() }));
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'trade' && payload.data) {
          // Find the most recent trade for our symbol in the payload batch
          const trades: MarketTick[] = payload.data.filter((t: any) => t.s === symbol.toUpperCase());
          if (trades.length > 0) {
            const latestTrade = trades[trades.length - 1];
            
            setPrice((currentPrice) => {
              if (currentPrice !== null) {
                setPrevPrice(currentPrice);
                if (latestTrade.p > currentPrice) setDirection('up');
                else if (latestTrade.p < currentPrice) setDirection('down');
                // else neutral
              }
              return latestTrade.p;
            });
          }
        }
      } catch (e) {
        console.error('Error parsing WS message', e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'unsubscribe', symbol: symbol.toUpperCase() }));
      }
      ws.close();
    };
  }, [symbol]);

  return { price, prevPrice, direction, isConnected };
}

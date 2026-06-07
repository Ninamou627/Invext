'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { CandlestickChart } from '@/components/market/CandlestickChart';
import { SentimentWidget } from '@/components/market/SentimentWidget';
import { TradeTerminal } from '@/components/trading/TradeTerminal';
import apiClient from '@/lib/api.client';
import { convertUsdToCurrency, formatCurrency } from '@/lib/currency';
import { useMarket } from '@/context/MarketContext';
import styles from './asset.module.css';

interface Quote {
  c: number;
  h: number;
  l: number;
  o: number;
  pc: number;
}

export default function AssetDetailPage() {
  const params = useParams();
  const { activeSymbol, setActiveSymbol, price, direction } = useMarket();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const symbol = useMemo(() => {
    const raw = Array.isArray(params.symbol) ? params.symbol[0] : params.symbol;
    return decodeURIComponent(String(raw || '')).toUpperCase();
  }, [params.symbol]);

  useEffect(() => {
    if (symbol && symbol !== activeSymbol) {
      setActiveSymbol(symbol);
    }
  }, [activeSymbol, setActiveSymbol, symbol]);

  useEffect(() => {
    let active = true;

    const fetchAsset = async () => {
      setLoading(true);
      setError('');

      try {
        const [quoteRes, profileRes] = await Promise.all([
          apiClient.get('/market/quote', { params: { symbol } }),
          apiClient.get('/user/profile'),
        ]);

        if (!active) return;
        setQuote(quoteRes.data);
        setCurrency(profileRes.data.preferredCurrency || 'USD');
      } catch (fetchError: any) {
        if (active) {
          setError(fetchError.response?.data?.error || 'Unable to load asset details.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    if (symbol) fetchAsset();

    return () => {
      active = false;
    };
  }, [symbol]);

  const displayPrice = price ?? quote?.c ?? null;
  const formattedLivePrice = displayPrice !== null
    ? formatCurrency(convertUsdToCurrency(displayPrice, currency), currency)
    : '--';

  const getDirectionLabel = () => {
    if (direction === 'up') return 'Up';
    if (direction === 'down') return 'Down';
    return 'Live';
  };

  const metric = (label: string, value?: number) => (
    <Card glass className={styles.metricCard}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricValue}>
        {typeof value === 'number'
          ? formatCurrency(convertUsdToCurrency(value, currency), currency)
          : '--'}
      </div>
    </Card>
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{symbol}</h1>
          <p className={styles.subtitle}>Asset details, live price and order entry.</p>
        </div>
        <div className={styles.liveBadge}>
          <span className={styles.liveLabel}>{getDirectionLabel()} price</span>
          <span className={styles.livePrice}>{formattedLivePrice}</span>
        </div>
      </header>

      {loading ? (
        <Card glass className={styles.status}>Loading asset details...</Card>
      ) : error ? (
        <Card glass className={styles.status}>{error}</Card>
      ) : (
        <div className={styles.grid}>
          <section>
            <CandlestickChart symbol={symbol} currency={currency} livePrice={displayPrice} />
            <SentimentWidget symbol={symbol} />

            <h2 className={styles.sectionTitle}>Market Snapshot</h2>
            <div className={styles.quoteGrid}>
              {metric('Current', quote?.c)}
              {metric('Open', quote?.o)}
              {metric('High', quote?.h)}
              {metric('Low', quote?.l)}
              {metric('Previous Close', quote?.pc)}
            </div>
          </section>

          <aside>
            <TradeTerminal currentSymbol={symbol} currentPrice={displayPrice} />
          </aside>
        </div>
      )}
    </div>
  );
}

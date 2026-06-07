'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { CandlestickChart } from '@/components/market/CandlestickChart';
import { SentimentWidget } from '@/components/market/SentimentWidget';
import { TradeTerminal } from '@/components/trading/TradeTerminal';
import apiClient from '@/lib/api.client';
import { convertUsdToCurrency, formatCurrency } from '@/lib/currency';
import { useMarket } from '@/context/MarketContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './asset.module.css';

interface Quote {
  c: number;
  h: number;
  l: number;
  o: number;
  pc: number;
}

export function AssetDetailClient({ symbol }: { symbol: string }) {
  const { t } = useLanguage();
  const { activeSymbol, setActiveSymbol, price, direction } = useMarket();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    if (direction === 'up') return t('asset.up');
    if (direction === 'down') return t('asset.down');
    return t('asset.live');
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
          <p className={styles.subtitle}>{t('asset.subtitle')}</p>
        </div>
        <div className={styles.liveBadge}>
          <span className={styles.liveLabel}>{t('asset.livePrice', { status: getDirectionLabel() })}</span>
          <span className={styles.livePrice}>{formattedLivePrice}</span>
        </div>
      </header>

      {loading ? (
        <Card glass className={styles.status}>{t('asset.loading')}</Card>
      ) : error ? (
        <Card glass className={styles.status}>{error}</Card>
      ) : (
        <div className={styles.grid}>
          <section>
            <CandlestickChart symbol={symbol} currency={currency} livePrice={displayPrice} />
            <SentimentWidget symbol={symbol} />

            <h2 className={styles.sectionTitle}>{t('asset.snapshot')}</h2>
            <div className={styles.quoteGrid}>
              {metric(t('asset.current'), quote?.c)}
              {metric(t('asset.open'), quote?.o)}
              {metric(t('asset.high'), quote?.h)}
              {metric(t('asset.low'), quote?.l)}
              {metric(t('asset.previousClose'), quote?.pc)}
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

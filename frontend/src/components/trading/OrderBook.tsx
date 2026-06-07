'use client';
import React, { useEffect, useState } from 'react';
import apiClient from '@/lib/api.client';
import { convertUsdToCurrency, formatCurrency } from '@/lib/currency';
import styles from './OrderBook.module.css';
import { useLanguage } from '@/context/LanguageContext';

interface OrderBookProps {
  ticker: string;
  preferredCurrency: string;
}

interface BookEntry {
  price: number;
  quantity: number;
}

export function OrderBook({ ticker, preferredCurrency }: OrderBookProps) {
  const { t } = useLanguage();
  const [bids, setBids] = useState<BookEntry[]>([]);
  const [asks, setAsks] = useState<BookEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchBook = async () => {
      try {
        const res = await apiClient.get(`/trading/orderbook/${ticker}`);
        if (active) {
          setBids(res.data.bids || []);
          setAsks(res.data.asks || []);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch order book', err);
      }
    };

    fetchBook();
    const interval = setInterval(fetchBook, 3000); // Poll every 3 seconds

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [ticker]);

  // Calculate maximum quantity to size the depth bars
  const maxQty = Math.max(
    ...bids.map(b => b.quantity),
    ...asks.map(a => a.quantity),
    1
  );

  // Spread calculation
  const highestBid = bids[0]?.price || null;
  const lowestAsk = asks[0]?.price || null;
  const spread = (lowestAsk !== null && highestBid !== null) ? (lowestAsk - highestBid) : null;
  const spreadPct = (spread !== null && highestBid !== null && highestBid > 0) ? (spread / highestBid) * 100 : null;

  // Render asks sorted descending (highest price on top, lowest ask at bottom next to the spread)
  const sortedAsks = [...asks].reverse();

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>{t('orderbook.title')} ({ticker})</h4>
      
      {loading ? (
        <div className={styles.loading}>{t('orderbook.loading')}</div>
      ) : (
        <div className={styles.bookGrid}>
          {/* Header */}
          <div className={styles.bookHeader}>
            <span>{t('orderbook.price')}</span>
            <span style={{ textAlign: 'right' }}>{t('orderbook.size')}</span>
          </div>

          {/* Asks (Sell orders) - Red */}
          <div className={styles.section}>
            {sortedAsks.length === 0 ? (
              <div className={styles.empty}>{t('orderbook.noAsks')}</div>
            ) : (
              sortedAsks.map((ask, idx) => {
                const depthPct = (ask.quantity / maxQty) * 100;
                return (
                  <div key={`ask-${idx}`} className={styles.row}>
                    <div 
                      className={styles.barRed} 
                      style={{ width: `${depthPct}%` }}
                    />
                    <span className={styles.priceRed}>
                      {formatCurrency(convertUsdToCurrency(ask.price, preferredCurrency), preferredCurrency)}
                    </span>
                    <span className={styles.quantity}>
                      {ask.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Spread Bar */}
          <div className={styles.spreadBar}>
            {spread !== null ? (
              <>
                <span>{t('orderbook.spread')}: {formatCurrency(convertUsdToCurrency(spread, preferredCurrency), preferredCurrency)}</span>
                <span>({spreadPct?.toFixed(2)}%)</span>
              </>
            ) : (
              <span>{t('orderbook.noSpread')}</span>
            )}
          </div>

          {/* Bids (Buy orders) - Green */}
          <div className={styles.section}>
            {bids.length === 0 ? (
              <div className={styles.empty}>{t('orderbook.noBids')}</div>
            ) : (
              bids.map((bid, idx) => {
                const depthPct = (bid.quantity / maxQty) * 100;
                return (
                  <div key={`bid-${idx}`} className={styles.row}>
                    <div 
                      className={styles.barGreen} 
                      style={{ width: `${depthPct}%` }}
                    />
                    <span className={styles.priceGreen}>
                      {formatCurrency(convertUsdToCurrency(bid.price, preferredCurrency), preferredCurrency)}
                    </span>
                    <span className={styles.quantity}>
                      {bid.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

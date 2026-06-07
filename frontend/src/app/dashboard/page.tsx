'use client';
import { useEffect, useMemo, useState } from 'react';
import styles from './dashboard.module.css';
import { useMarket } from '@/context/MarketContext';
import { TradeTerminal } from '@/components/trading/TradeTerminal';
import { AdvancedRealTimeChart } from 'react-ts-tradingview-widgets';
import { Card } from '@/components/ui/Card';
import apiClient from '@/lib/api.client';
import { formatCurrency } from '@/lib/currency';

interface Holding {
  id: string;
  ticker: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  currentValue: number;
  pl: number;
  plPercentage: number;
  currency: string;
}

export default function DashboardHome() {
  const { activeSymbol, price } = useMarket();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(true);

  const fetchPositions = async () => {
    setPositionsLoading(true);
    try {
      const response = await apiClient.get('/portfolio/dashboard');
      setHoldings(response.data.holdings || []);
    } catch (error) {
      console.error('Failed to fetch open positions', error);
    } finally {
      setPositionsLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();

    if (typeof window !== 'undefined') {
      window.addEventListener('update-portfolio', fetchPositions);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('update-portfolio', fetchPositions);
      }
    };
  }, []);

  const orderedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => {
      const aActive = a.ticker === activeSymbol ? 0 : 1;
      const bActive = b.ticker === activeSymbol ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return b.currentValue - a.currentValue;
    });
  }, [activeSymbol, holdings]);

  return (
    <div className={styles.onePager}>
      {/* LEFT COLUMN: Ultra Wide Chart */}
      <div style={{ position: 'relative', height: '100%', borderRight: '1px solid var(--border-light)' }}>
        <AdvancedRealTimeChart
          key={activeSymbol}
          theme="dark"
          autosize
          symbol={activeSymbol}
          timezone="Etc/UTC"
          style="1"
          locale="fr"
          enable_publishing={false}
          allow_symbol_change={true}
          details={false}
          container_id="tradingview_chart_investx"
        />
      </div>

      {/* RIGHT COLUMN: Terminal Engine */}
      <div style={{ padding: '1.5rem', background: 'var(--bg-surface)', overflowY: 'auto' }}>
        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', color: 'var(--text-primary)' }}>Trading Terminal</h3>
        <TradeTerminal
          currentSymbol={activeSymbol}
          currentPrice={price}
        />

        <Card style={{ marginTop: '1.5rem', padding: '1rem' }}>
          <h4 className={styles.positionsTitle}>Open Positions</h4>
          {positionsLoading ? (
            <p className={styles.positionsEmpty}>Loading positions...</p>
          ) : orderedHoldings.length === 0 ? (
            <p className={styles.positionsEmpty}>Your portfolio has no holdings yet.</p>
          ) : (
            <div className={styles.positionsList}>
              {orderedHoldings.map((holding) => {
                const isActive = holding.ticker === activeSymbol;
                const isProfit = holding.pl >= 0;

                return (
                  <div key={holding.id} className={`${styles.positionRow} ${isActive ? styles.positionActive : ''}`}>
                    <div>
                      <div className={styles.positionTicker}>{holding.ticker}</div>
                      <div className={styles.positionMeta}>
                        Qty {holding.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                      </div>
                    </div>
                    <div className={styles.positionNumbers}>
                      <span>{formatCurrency(holding.currentValue, holding.currency)}</span>
                      <span className={isProfit ? styles.positionProfit : styles.positionLoss}>
                        {isProfit ? '+' : ''}{formatCurrency(holding.pl, holding.currency)}
                        {' '}
                        ({holding.plPercentage.toFixed(2)}%)
                      </span>
                    </div>
                    <div className={styles.positionDetails}>
                      <span>Avg {formatCurrency(holding.avgBuyPrice, holding.currency)}</span>
                      <span>Now {formatCurrency(holding.currentPrice, holding.currency)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

    </div>
  );
}

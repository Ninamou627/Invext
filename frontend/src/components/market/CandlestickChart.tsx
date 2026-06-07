'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import apiClient from '@/lib/api.client';
import { convertUsdToCurrency, formatCurrency } from '@/lib/currency';
import styles from './CandlestickChart.module.css';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface FinnhubCandles {
  s: string;
  t?: number[];
  o?: number[];
  h?: number[];
  l?: number[];
  c?: number[];
  v?: number[];
}

interface CandlestickChartProps {
  symbol: string;
  currency: string;
  livePrice?: number | null;
  days?: number;
}

const VIEWBOX_WIDTH = 960;
const VIEWBOX_HEIGHT = 360;
const PADDING = { top: 18, right: 82, bottom: 30, left: 12 };

const normalizeCandles = (payload: FinnhubCandles): Candle[] => {
  if (payload.s !== 'ok' || !payload.t || !payload.o || !payload.h || !payload.l || !payload.c) {
    return [];
  }

  return payload.t
    .map((time, index) => ({
      time,
      open: Number(payload.o?.[index] ?? 0),
      high: Number(payload.h?.[index] ?? 0),
      low: Number(payload.l?.[index] ?? 0),
      close: Number(payload.c?.[index] ?? 0),
      volume: Number(payload.v?.[index] ?? 0),
    }))
    .filter((candle) => candle.time > 0 && candle.high > 0 && candle.low > 0)
    .slice(-40);
};

export function CandlestickChart({ symbol, currency, livePrice = null, days = 45 }: CandlestickChartProps) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const fetchCandles = async () => {
      setLoading(true);
      setError('');

      const to = Math.floor(Date.now() / 1000);
      const from = to - days * 24 * 60 * 60;

      try {
        const response = await apiClient.get('/market/history', {
          params: { symbol, resolution: 'D', from, to },
        });

        if (!active) return;
        setCandles(normalizeCandles(response.data));
      } catch (fetchError: any) {
        if (active) {
          setError(fetchError.response?.data?.error || 'Unable to load candle data.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    if (symbol) fetchCandles();

    return () => {
      active = false;
    };
  }, [days, symbol]);

  const rendered = useMemo(() => {
    if (candles.length === 0) return null;

    const chartWidth = VIEWBOX_WIDTH - PADDING.left - PADDING.right;
    const chartHeight = VIEWBOX_HEIGHT - PADDING.top - PADDING.bottom;
    const converted = candles.map((candle) => ({
      ...candle,
      open: convertUsdToCurrency(candle.open, currency),
      high: convertUsdToCurrency(candle.high, currency),
      low: convertUsdToCurrency(candle.low, currency),
      close: convertUsdToCurrency(candle.close, currency),
    }));

    const liveConverted = livePrice ? convertUsdToCurrency(livePrice, currency) : null;
    const allHighs = converted.map((candle) => candle.high);
    const allLows = converted.map((candle) => candle.low);
    if (liveConverted) {
      allHighs.push(liveConverted);
      allLows.push(liveConverted);
    }

    const maxPrice = Math.max(...allHighs);
    const minPrice = Math.min(...allLows);
    const range = Math.max(maxPrice - minPrice, 1);
    const paddedMax = maxPrice + range * 0.08;
    const paddedMin = minPrice - range * 0.08;
    const paddedRange = paddedMax - paddedMin;

    const yFor = (price: number) => {
      return PADDING.top + ((paddedMax - price) / paddedRange) * chartHeight;
    };

    const step = chartWidth / Math.max(converted.length, 1);
    const candleWidth = Math.max(4, Math.min(16, step * 0.58));
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => paddedMax - paddedRange * ratio);

    return {
      converted,
      yFor,
      step,
      candleWidth,
      ticks,
      liveConverted,
    };
  }, [candles, currency, livePrice]);

  return (
    <Card glass className={styles.chartShell}>
      <div className={styles.header}>
        <h2 className={styles.title}>Custom Candlestick Chart</h2>
        <span className={styles.meta}>{symbol} · Daily · Backend candles</span>
      </div>

      {loading ? (
        <div className={styles.state}>Loading candles...</div>
      ) : error ? (
        <div className={styles.state}>{error}</div>
      ) : !rendered ? (
        <div className={styles.state}>No candle data available for this asset.</div>
      ) : (
        <div className={styles.chartArea}>
          <svg className={styles.svg} viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} role="img" aria-label={`${symbol} candlestick chart`}>
            {rendered.ticks.map((tick) => {
              const y = rendered.yFor(tick);
              return (
                <g key={tick}>
                  <line className={styles.gridLine} x1={PADDING.left} x2={VIEWBOX_WIDTH - PADDING.right} y1={y} y2={y} />
                  <text className={styles.axisLabel} x={VIEWBOX_WIDTH - PADDING.right + 10} y={y + 4}>
                    {formatCurrency(tick, currency, { maximumFractionDigits: 0 })}
                  </text>
                </g>
              );
            })}

            {rendered.converted.map((candle, index) => {
              const xCenter = PADDING.left + rendered.step * index + rendered.step / 2;
              const openY = rendered.yFor(candle.open);
              const closeY = rendered.yFor(candle.close);
              const highY = rendered.yFor(candle.high);
              const lowY = rendered.yFor(candle.low);
              const up = candle.close >= candle.open;
              const bodyY = Math.min(openY, closeY);
              const bodyHeight = Math.max(2, Math.abs(closeY - openY));

              return (
                <g key={`${candle.time}-${index}`}>
                  <line
                    className={up ? styles.wickUp : styles.wickDown}
                    x1={xCenter}
                    x2={xCenter}
                    y1={highY}
                    y2={lowY}
                  />
                  <rect
                    className={up ? styles.up : styles.down}
                    x={xCenter - rendered.candleWidth / 2}
                    y={bodyY}
                    width={rendered.candleWidth}
                    height={bodyHeight}
                    rx={1}
                  />
                </g>
              );
            })}

            {rendered.liveConverted && (
              <g>
                <line
                  className={styles.liveLine}
                  x1={PADDING.left}
                  x2={VIEWBOX_WIDTH - PADDING.right}
                  y1={rendered.yFor(rendered.liveConverted)}
                  y2={rendered.yFor(rendered.liveConverted)}
                />
                <text className={styles.liveLabel} x={VIEWBOX_WIDTH - PADDING.right + 10} y={rendered.yFor(rendered.liveConverted) - 6}>
                  Live
                </text>
              </g>
            )}
          </svg>
        </div>
      )}
    </Card>
  );
}

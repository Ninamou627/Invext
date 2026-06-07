'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import apiClient from '@/lib/api.client';
import styles from './SentimentWidget.module.css';

interface SentimentArticle {
  title: string;
  source: string;
  url: string;
}

interface SentimentPayload {
  overallScore: number;
  overallLabel: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  articles: SentimentArticle[];
  dominantKeywords: Array<{ word: string; score: number; count: number }>;
}

interface SentimentWidgetProps {
  symbol: string;
}

const labelClass = (label: SentimentPayload['overallLabel']) => {
  if (label === 'BULLISH') return styles.bullish;
  if (label === 'BEARISH') return styles.bearish;
  return styles.neutral;
};

export function SentimentWidget({ symbol }: SentimentWidgetProps) {
  const [sentiment, setSentiment] = useState<SentimentPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const fetchSentiment = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await apiClient.get(`/news/${encodeURIComponent(symbol)}/sentiment`);
        if (active) setSentiment(response.data);
      } catch (fetchError: any) {
        if (active) setError(fetchError.response?.data?.error || 'Unable to load sentiment data.');
      } finally {
        if (active) setLoading(false);
      }
    };

    if (symbol) fetchSentiment();

    return () => {
      active = false;
    };
  }, [symbol]);

  return (
    <Card glass className={styles.shell}>
      {loading ? (
        <div className={styles.state}>Loading sentiment...</div>
      ) : error ? (
        <div className={styles.state}>{error}</div>
      ) : !sentiment ? (
        <div className={styles.state}>No sentiment data available.</div>
      ) : (
        <>
          <div className={styles.header}>
            <h2 className={styles.title}>News Sentiment</h2>
            <span className={`${styles.label} ${labelClass(sentiment.overallLabel)}`}>
              {sentiment.overallLabel}
            </span>
          </div>

          <div className={styles.scoreGrid}>
            <div className={styles.scoreBox}>
              <div className={styles.scoreLabel}>Score</div>
              <div className={styles.scoreValue}>{sentiment.overallScore.toFixed(3)}</div>
            </div>
            <div className={styles.scoreBox}>
              <div className={styles.scoreLabel}>Bullish</div>
              <div className={styles.scoreValue}>{sentiment.bullishCount}</div>
            </div>
            <div className={styles.scoreBox}>
              <div className={styles.scoreLabel}>Bearish</div>
              <div className={styles.scoreValue}>{sentiment.bearishCount}</div>
            </div>
            <div className={styles.scoreBox}>
              <div className={styles.scoreLabel}>Neutral</div>
              <div className={styles.scoreValue}>{sentiment.neutralCount}</div>
            </div>
          </div>

          {sentiment.dominantKeywords.length > 0 && (
            <div className={styles.keywords}>
              {sentiment.dominantKeywords.slice(0, 8).map((keyword) => (
                <span key={keyword.word} className={styles.keyword}>
                  {keyword.word} ({keyword.count})
                </span>
              ))}
            </div>
          )}

          <div className={styles.articles}>
            {sentiment.articles.slice(0, 3).map((article) => (
              <div key={`${article.url}-${article.title}`} className={styles.article}>
                <a href={article.url} target="_blank" rel="noreferrer">
                  {article.title}
                </a>
                {article.source ? ` · ${article.source}` : ''}
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

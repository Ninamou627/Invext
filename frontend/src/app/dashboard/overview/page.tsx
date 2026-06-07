'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import apiClient from '@/lib/api.client';
import styles from './overview.module.css';
import { formatCurrency } from '@/lib/currency';
import { Wallet, TrendingUp, PieChart } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface PortfolioDashboard {
  cashBalance: number;
  totalEquity: number;
  totalPortfolioValue: number;
  totalPL: number;
  totalPLPercentage: number;
}

interface Snapshot {
  id: string;
  snapshotAt: string;
  totalValue: number;
  cashBalance: number;
  equityValue: number;
}

export default function OverviewPage() {
  const { language, t } = useLanguage();
  const [dashboard, setDashboard] = useState<PortfolioDashboard | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    const fetchOverviewData = async () => {
      setLoading(true);
      try {
        const [dashRes, snapRes, profileRes] = await Promise.all([
          apiClient.get('/portfolio/dashboard'),
          apiClient.get('/portfolio/snapshots?days=30'),
          apiClient.get('/user/profile')
        ]);
        setDashboard(dashRes.data);
        setSnapshots(snapRes.data);
        setCurrency(profileRes.data.preferredCurrency || 'USD');
      } catch (error) {
        console.error('Failed to fetch overview data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, []);

  if (loading || !dashboard) {
    return <div className={styles.loading}>{t('common.loading')}</div>;
  }

  // Prepare chart data
  const locale = language === 'fr' ? 'fr-FR' : 'en-US';
  const chartData = snapshots.map(snap => ({
    date: new Date(snap.snapshotAt).toLocaleDateString(locale, { month: 'short', day: 'numeric' }),
    value: snap.totalValue
  }));

  const today = new Date();
  const todayStr = today.toLocaleDateString(locale, { month: 'short', day: 'numeric' });

  if (chartData.length === 0) {
    // Si aucun snapshot, créer une ligne plate d'hier à aujourd'hui
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    chartData.push({ 
      date: yesterday.toLocaleDateString(locale, { month: 'short', day: 'numeric' }),
      value: dashboard.totalPortfolioValue 
    });
    chartData.push({ date: todayStr, value: dashboard.totalPortfolioValue });
  } else {
    // Ajouter la valeur actuelle si le dernier snapshot n'est pas d'aujourd'hui
    if (chartData[chartData.length - 1].date !== todayStr) {
      chartData.push({ date: todayStr, value: dashboard.totalPortfolioValue });
    }
    
    // S'il n'y a qu'un seul point au total, ajouter un point pour hier pour tracer la ligne
    if (chartData.length === 1) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      chartData.unshift({ 
        date: yesterday.toLocaleDateString(locale, { month: 'short', day: 'numeric' }),
        value: chartData[0].value 
      });
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('overview.title')}</h1>
        <p className={styles.subtitle}>{t('overview.subtitle')}</p>
      </header>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <Card glass className={styles.summaryCard}>
          <div className={styles.cardTitle}>
            <PieChart size={18} /> {t('overview.totalValue')}
          </div>
          <div className={styles.cardValue}>
            {formatCurrency(dashboard.totalPortfolioValue, currency)}
          </div>
        </Card>

        <Card glass className={styles.summaryCard}>
          <div className={styles.cardTitle}>
            <Wallet size={18} /> {t('overview.cash')}
          </div>
          <div className={styles.cardValue}>
            {formatCurrency(dashboard.cashBalance, currency)}
          </div>
        </Card>

        <Card glass className={styles.summaryCard}>
          <div className={styles.cardTitle}>
            <TrendingUp size={18} /> {t('overview.totalPL')}
          </div>
          <div className={styles.cardValue}>
            <span className={dashboard.totalPL >= 0 ? styles.positive : styles.negative}>
              {dashboard.totalPL > 0 ? '+' : ''}{formatCurrency(dashboard.totalPL, currency)}
            </span>
          </div>
          <div className={`${styles.cardChange} ${dashboard.totalPLPercentage >= 0 ? styles.positive : styles.negative}`}>
            {dashboard.totalPLPercentage > 0 ? '↑' : dashboard.totalPLPercentage < 0 ? '↓' : ''} 
            {Math.abs(dashboard.totalPLPercentage)}% ({t('overview.allTime')})
          </div>
        </Card>
      </div>

      {/* Chart Section */}
      <Card glass className={styles.chartSection}>
        <h2 className={styles.chartTitle}>{t('overview.accountEvolution')}</h2>
        <div className={styles.chartContainer}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="var(--text-muted)" 
                  tick={{ fill: 'var(--text-muted)', fontSize: 12 }} 
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="var(--text-muted)" 
                  tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                  tickFormatter={(val) => new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(val)}
                  axisLine={false}
                  tickLine={false}
                  domain={['auto', 'auto']}
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-glass)', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  itemStyle={{ color: 'var(--accent-primary)' }}
                  formatter={(value) => formatCurrency(Number(value ?? 0), currency)}
                  labelStyle={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="var(--accent-primary)" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: 'var(--bg-surface)', stroke: 'var(--accent-primary)', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: 'var(--accent-primary)', stroke: 'var(--bg-surface)', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              {t('overview.notEnoughData')}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

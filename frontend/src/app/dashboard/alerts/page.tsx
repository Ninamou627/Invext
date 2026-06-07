'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import apiClient from '@/lib/api.client';
import styles from './alerts.module.css';
import { getCurrencySymbol } from '@/lib/currency';
import { Trash2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface Alert {
  id: string;
  ticker: string;
  targetPrice: number;
  condition: 'ABOVE' | 'BELOW';
  isTriggered: boolean;
  createdAt: string;
}

export default function AlertsPage() {
  const { language, t } = useLanguage();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [preferredCurrency, setPreferredCurrency] = useState('USD');
  
  const [ticker, setTicker] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [condition, setCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/alerts');
      setAlerts(res.data);
    } catch (error) {
      console.error('Failed to fetch alerts', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiClient.get('/user/profile');
        if (response.data?.preferredCurrency) {
          setPreferredCurrency(response.data.preferredCurrency);
        }
      } catch (err) {
        console.error('Failed to fetch profile in AlertsPage', err);
      }
    };
    fetchProfile();
    fetchAlerts();
  }, []);

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/alerts', {
        ticker: ticker.toUpperCase(),
        targetPrice: parseFloat(targetPrice),
        condition
      });
      setTicker('');
      setTargetPrice('');
      fetchAlerts();
    } catch (error) {
      console.error('Failed to create alert', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      await apiClient.delete(`/alerts/${id}`);
      setAlerts(alerts.filter(a => a.id !== id));
    } catch (error) {
      console.error('Failed to delete alert', error);
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-US', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(d);
  };

  const currencySymbol = getCurrencySymbol(preferredCurrency);

  return (
    <div className={styles.container}>
      <div>
        <h1 className={styles.title}>{t('alerts.title')}</h1>
        <p className={styles.subtitle}>{t('alerts.subtitle')}</p>
      </div>

      <div className={styles.grid}>
        {/* Create Alert Form */}
        <Card glass>
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>{t('alerts.create')}</h2>
            <form onSubmit={handleCreateAlert} className={styles.formSection}>
              <div className={styles.formGroup}>
                <label className={styles.label}>{t('alerts.symbol')}</label>
                <input 
                  type="text" 
                  value={ticker} 
                  onChange={(e) => setTicker(e.target.value)} 
                  className={styles.input} 
                  placeholder="e.g. AAPL"
                  required 
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{t('alerts.condition')}</label>
                <select 
                  value={condition} 
                  onChange={(e) => setCondition(e.target.value as 'ABOVE' | 'BELOW')} 
                  className={styles.input}
                >
                  <option value="ABOVE">{t('alerts.above')}</option>
                  <option value="BELOW">{t('alerts.below')}</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{t('alerts.targetPrice')} ({preferredCurrency})</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={targetPrice} 
                  onChange={(e) => setTargetPrice(e.target.value)} 
                  className={styles.input} 
                  placeholder="0.00"
                  required 
                />
              </div>
              <button type="submit" className={styles.button} disabled={isSubmitting}>
                {isSubmitting ? t('alerts.creating') : t('alerts.set')}
              </button>
            </form>
          </div>
        </Card>

        {/* Alerts List */}
        <Card glass>
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>{t('alerts.yours')}</h2>
            <div className={styles.tableContainer}>
              {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>{t('alerts.loading')}</div>
              ) : alerts.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>{t('alerts.empty')}</div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{t('trade.asset')}</th>
                      <th>{t('alerts.condition')}</th>
                      <th>{t('alerts.target')}</th>
                      <th>{t('alerts.status')}</th>
                      <th>{t('alerts.created')}</th>
                      <th>{t('trade.action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((alert) => (
                      <tr key={alert.id}>
                        <td style={{ fontWeight: 600 }}>{alert.ticker}</td>
                        <td>{alert.condition === 'ABOVE' ? '≥' : '≤'}</td>
                        <td>{currencySymbol}{Number(alert.targetPrice).toFixed(2)}</td>
                        <td>
                          <span className={`${styles.badge} ${alert.isTriggered ? styles.triggered : styles.active}`}>
                            {alert.isTriggered ? t('alerts.triggered') : t('alerts.active')}
                          </span>
                        </td>
                        <td>{formatDate(alert.createdAt)}</td>
                        <td>
                          <button 
                            className={styles.deleteBtn} 
                            onClick={() => handleDeleteAlert(alert.id)}
                            title={t('alerts.delete')}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

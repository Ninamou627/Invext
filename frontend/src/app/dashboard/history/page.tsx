'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import apiClient from '@/lib/api.client';
import styles from './history.module.css';

interface Transaction {
  id: string;
  ticker: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  pricePerUnit: number;
  totalAmount: number;
  currency: string;
  executedAt: string;
}

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchHistory = async (p: number) => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/portfolio/history?page=${p}&limit=10`);
      setTransactions(res.data.transactions);
      setTotalPages(res.data.pagination.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch history', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(page);
  }, [page]);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  };

  const formatCurrency = (val: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(val);
  };

  return (
    <div className={styles.container}>
      <div>
        <h1 className={styles.title}>Transaction History</h1>
        <p className={styles.subtitle}>Review your past trades and financial activity.</p>
      </div>

      <Card glass>
        <div className={styles.tableContainer}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading history...</div>
          ) : transactions.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No transactions found.</div>
          ) : (
            <>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Asset</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{formatDate(tx.executedAt)}</td>
                      <td style={{ fontWeight: 600 }}>{tx.ticker}</td>
                      <td>
                        <span className={`${styles.typeBadge} ${tx.type === 'BUY' ? styles.buy : styles.sell}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td>{tx.quantity}</td>
                      <td>{formatCurrency(tx.pricePerUnit, tx.currency)}</td>
                      <td>{formatCurrency(tx.totalAmount, tx.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className={styles.pagination}>
                <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
                <div className={styles.pageControls}>
                  <button 
                    className={styles.pageBtn} 
                    disabled={page <= 1} 
                    onClick={() => setPage(p => p - 1)}
                  >
                    Previous
                  </button>
                  <button 
                    className={styles.pageBtn} 
                    disabled={page >= totalPages} 
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

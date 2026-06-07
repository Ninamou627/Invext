'use client';
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import apiClient from '@/lib/api.client';
import { convertUsdToCurrency, getCurrencySymbol, formatCurrency } from '@/lib/currency';
import { OrderBook } from './OrderBook';
import { useLanguage } from '@/context/LanguageContext';

interface TradeTerminalProps {
  currentSymbol: string;
  currentPrice: number | null;
  onTradeSuccess?: () => void;
}

export function TradeTerminal({ currentSymbol, currentPrice, onTradeSuccess }: TradeTerminalProps) {
  const { t } = useLanguage();
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [quantity, setQuantity] = useState<string>('1');
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [preferredCurrency, setPreferredCurrency] = useState<string>('USD');
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchProfile = async () => {
    try {
      const response = await apiClient.get('/user/profile');
      if (response.data?.preferredCurrency) {
        setPreferredCurrency(response.data.preferredCurrency);
      }
    } catch (err) {
      console.error('Failed to fetch profile in TradeTerminal', err);
    }
  };

  const fetchPendingOrders = async () => {
    try {
      const response = await apiClient.get('/trading/orders');
      setPendingOrders(response.data || []);
    } catch (err) {
      console.error('Failed to fetch pending orders', err);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchPendingOrders();
  }, []);

  useEffect(() => {
    fetchPendingOrders();
  }, [currentSymbol]);

  const displayPrice = currentPrice
    ? convertUsdToCurrency(currentPrice, preferredCurrency)
    : null;

  const estimatedValueNum = displayPrice ? (parseFloat(quantity || '0') * displayPrice) : null;
  const limitValueNum = limitPrice ? (parseFloat(quantity || '0') * parseFloat(limitPrice)) : null;
  const currencySymbol = getCurrencySymbol(preferredCurrency);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (orderType === 'MARKET') {
        const path = side === 'BUY' ? '/trading/buy' : '/trading/sell';
        await apiClient.post(path, {
          ticker: currentSymbol,
          quantity: parseFloat(quantity)
        });
        setSuccess(t('trade.successMarket', { side: side === 'BUY' ? t('trade.buy') : t('trade.sell') }));
      } else {
        await apiClient.post('/trading/orders', {
          ticker: currentSymbol,
          side,
          quantity: parseFloat(quantity),
          limitPrice: parseFloat(limitPrice)
        });
        setSuccess(t('trade.successLimit', {
          side: side === 'BUY' ? t('trade.buy') : t('trade.sell'),
          price: formatCurrency(parseFloat(limitPrice), preferredCurrency),
        }));
      }
      
      if (onTradeSuccess) onTradeSuccess();
      fetchPendingOrders();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('update-portfolio'));
      }
    } catch (err: any) {
      setError(err.response?.data?.error || t('trade.error', { side: side === 'BUY' ? t('trade.buy') : t('trade.sell') }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await apiClient.delete(`/trading/orders/${orderId}`);
      fetchPendingOrders();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('update-portfolio'));
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to cancel order.');
    }
  };

  return (
    <div>
      <Card glass style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <Button 
            style={{ flex: 1, backgroundColor: side === 'BUY' ? 'var(--accent-success)' : 'transparent', color: side === 'BUY' ? '#000' : 'var(--text-primary)' }}
            onClick={() => setSide('BUY')}
          >
            {t('trade.buy')}
          </Button>
          <Button 
            style={{ flex: 1, backgroundColor: side === 'SELL' ? 'var(--accent-danger)' : 'transparent', color: side === 'SELL' ? '#000' : 'var(--text-primary)' }}
            onClick={() => setSide('SELL')}
          >
            {t('trade.sell')}
          </Button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
          <button 
            style={{ background: 'none', border: 'none', color: orderType === 'MARKET' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: orderType === 'MARKET' ? 600 : 400, cursor: 'pointer' }}
            onClick={() => setOrderType('MARKET')}
          >
            {t('trade.market')}
          </button>
          <button 
            style={{ background: 'none', border: 'none', color: orderType === 'LIMIT' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: orderType === 'LIMIT' ? 600 : 400, cursor: 'pointer' }}
            onClick={() => setOrderType('LIMIT')}
          >
            {t('trade.limit')}
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && <div style={{ color: 'var(--accent-danger)', fontSize: '0.875rem' }}>{error}</div>}
          {success && <div style={{ color: 'var(--accent-success)', fontSize: '0.875rem' }}>{success}</div>}

          <Input 
            label={orderType === 'MARKET' ? `${t('trade.marketPrice')} (${currencySymbol})` : `${t('trade.limitPrice')} (${currencySymbol})`}
            disabled={orderType === 'MARKET'} 
            value={orderType === 'MARKET' ? (displayPrice ? displayPrice.toFixed(2) : t('trade.loadingPrice')) : limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            type="number"
            step="0.01"
            required={orderType === 'LIMIT'}
          />

          <Input 
            label={t('trade.quantity')}
            type="number" 
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="0.01" 
            step="any"
            required 
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', color: 'var(--text-secondary)' }}>
            <span>{t('trade.estimatedTotal')}</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              {orderType === 'MARKET'
                ? (estimatedValueNum !== null ? formatCurrency(estimatedValueNum, preferredCurrency) : '--')
                : (limitValueNum !== null ? formatCurrency(limitValueNum, preferredCurrency) : '--')}
            </span>
          </div>

          <Button 
            type="submit" 
            isLoading={isLoading} 
            disabled={!currentPrice}
            style={{ 
              backgroundColor: side === 'BUY' ? 'var(--accent-success)' : 'var(--accent-danger)',
              color: '#000',
              marginTop: '0.5rem'
            }}
          >
            {side === 'BUY' ? t('trade.buy').toUpperCase() : t('trade.sell').toUpperCase()} {currentSymbol}
          </Button>
        </form>
      </Card>

      {/* Order Book Depth */}
      <OrderBook ticker={currentSymbol} preferredCurrency={preferredCurrency} />

      {/* Pending Orders list */}
      {pendingOrders.length > 0 && (
        <Card glass style={{ marginTop: '1rem', padding: '1.25rem' }}>
          <h4 style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            {t('trade.pendingOrders')}
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem 0' }}>{t('trade.asset')}</th>
                  <th>{t('trade.side')}</th>
                  <th>{t('trade.price')}</th>
                  <th>{t('trade.filled')}</th>
                  <th style={{ textAlign: 'right' }}>{t('trade.action')}</th>
                </tr>
              </thead>
              <tbody>
                {pendingOrders.map((order) => {
                  const filledQty = Number(order.filledQuantity);
                  const totalQty = Number(order.quantity);
                  const isBuy = order.side === 'BUY';
                  return (
                    <tr key={order.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '0.5rem 0', fontWeight: 600 }}>{order.ticker}</td>
                      <td style={{ color: isBuy ? 'var(--accent-success)' : 'var(--accent-danger)', fontWeight: 600 }}>{order.side}</td>
                      <td>
                        {order.limitPrice 
                          ? formatCurrency(convertUsdToCurrency(Number(order.limitPrice), preferredCurrency), preferredCurrency)
                          : t('trade.market')}
                      </td>
                      <td>{filledQty}/{totalQty}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#ef4444',
                            borderRadius: '4px',
                            padding: '2px 8px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            transition: 'all 0.2s',
                            fontWeight: 600
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#ef4444';
                            e.currentTarget.style.color = '#000';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                            e.currentTarget.style.color = '#ef4444';
                          }}
                        >
                          {t('trade.cancel')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

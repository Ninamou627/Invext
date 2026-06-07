'use client';

import React, { useEffect, useState } from 'react';
import apiClient from '@/lib/api.client';
import { Bell, X } from 'lucide-react';
import { getCurrencySymbol } from '@/lib/currency';

interface Alert {
  id: string;
  ticker: string;
  targetPrice: number;
  condition: string;
  isTriggered: boolean;
}

export function AlertNotifier() {
  const [notifications, setNotifications] = useState<Alert[]>([]);
  const [preferredCurrency, setPreferredCurrency] = useState('USD');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiClient.get('/user/profile');
        if (response.data?.preferredCurrency) {
          setPreferredCurrency(response.data.preferredCurrency);
        }
      } catch (err) {
        console.error('Failed to fetch profile in AlertNotifier', err);
      }
    };
    fetchProfile();

    // Poll for triggered alerts every 15 seconds
    const checkAlerts = async () => {
      try {
        const res = await apiClient.get('/alerts');
        const allAlerts: Alert[] = res.data;
        
        // Find alerts that are triggered
        const triggered = allAlerts.filter(a => a.isTriggered);
        
        if (triggered.length > 0) {
          // Check local storage to see which ones we already notified about
          const notifiedIds = JSON.parse(localStorage.getItem('notifiedAlerts') || '[]');
          
          const newNotifications = triggered.filter(a => !notifiedIds.includes(a.id));
          
          if (newNotifications.length > 0) {
            setNotifications(prev => [...prev, ...newNotifications]);
            
            // Update local storage
            const updatedNotifiedIds = [...notifiedIds, ...newNotifications.map(a => a.id)];
            localStorage.setItem('notifiedAlerts', JSON.stringify(updatedNotifiedIds));
          }
        }
      } catch {
        // Silent fail for polling
      }
    };

    checkAlerts();
    const interval = setInterval(checkAlerts, 15000);
    return () => clearInterval(interval);
  }, []);

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '2rem',
      right: '2rem',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    }}>
      {notifications.map(notification => (
        <div 
          key={notification.id}
          style={{
            background: 'rgba(15, 15, 19, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--accent-warning)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 15px rgba(255, 171, 0, 0.2)',
            borderRadius: '8px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
            width: '320px',
            animation: 'slideIn 0.3s ease-out forwards'
          }}
        >
          <div style={{ color: 'var(--accent-warning)', padding: '0.25rem' }}>
            <Bell size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)', fontSize: '0.875rem' }}>Price Alert Triggered!</h4>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.4' }}>
              <strong>{notification.ticker}</strong> has gone {notification.condition.toLowerCase()} your target of <strong>{getCurrencySymbol(preferredCurrency)}{Number(notification.targetPrice).toFixed(2)}</strong>.
            </p>
          </div>
          <button 
            onClick={() => dismissNotification(notification.id)}
            style={{ 
              background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' 
            }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}} />
    </div>
  );
}

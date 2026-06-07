'use client';
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import apiClient from '@/lib/api.client';
import { Trophy } from 'lucide-react';
import { getCurrencySymbol } from '@/lib/currency';

interface LeaderboardUser {
  userId: string;
  username: string;
  totalValue: number;
  totalReturnPercentage: number;
  preferredCurrency?: string;
}

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await apiClient.get('/portfolio/leaderboard');
        setLeaders(response.data);
      } catch {
        console.error('Failed to fetch leaderboard');
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ padding: '0.75rem', background: 'rgba(255,215,0,0.1)', borderRadius: '12px', color: '#FFD700' }}>
          <Trophy size={32} />
        </div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem' }}>Global Rankings</h1>
      </div>
      
      <Card glass>
        {isLoading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading competitive rankings...</p>
        ) : leaders.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No trading data available yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {leaders.map((user, index) => {
              const isTop3 = index < 3;
              const currencySymbol = getCurrencySymbol(user.preferredCurrency || 'USD');
              const roi = user.totalReturnPercentage || 0;
              return (
                <div key={user.userId} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  background: isTop3 ? 'rgba(0, 240, 255, 0.05)' : 'var(--bg-surface)', 
                  padding: '1.25rem 2rem', 
                  borderRadius: '12px',
                  border: isTop3 ? '1px solid rgba(0, 240, 255, 0.2)' : '1px solid var(--border-light)',
                  boxShadow: index === 0 ? '0 0 20px rgba(0, 240, 255, 0.1)' : 'none',
                  transition: 'transform 0.2s ease'
                }} className="leader-row">
                  <div style={{ width: '40px', fontSize: '1.25rem', fontWeight: 700, color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'var(--text-muted)' }}>
                    #{index + 1}
                  </div>
                  <div style={{ flex: 1, fontSize: '1.125rem', fontWeight: 500 }}>
                    {user.username}
                  </div>
                  <div style={{ flex: 1, textAlign: 'right', fontWeight: 700, fontSize: '1.125rem' }}>
                    {currencySymbol}{Number(user.totalValue).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <div style={{ width: '120px', textAlign: 'right', fontWeight: 600, color: roi >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                    {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      
      <style dangerouslySetInnerHTML={{__html:`
        .leader-row:hover { transform: scale(1.01); }
      `}} />
    </div>
  );
}

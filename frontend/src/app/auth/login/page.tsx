'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import apiClient from '@/lib/api.client';
import styles from '../auth.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/auth/login', { email, password });
      
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      if (response.data.refreshTokenExpiresAt) {
        localStorage.setItem('refreshTokenExpiresAt', response.data.refreshTokenExpiresAt);
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to login, please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <Link href="/" className={styles.backLink}>
        <ArrowLeft size={16} /> Back to Home
      </Link>
      
      <Card glass className={styles.authCard}>
        <div className={styles.header}>
          <h1 className={styles.title}>Welcome Back</h1>
          <p className={styles.subtitle}>Enter your credentials to access your account</p>
        </div>

        {error && (
          <div className={styles.errorsBanner}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input 
            label="Email" 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
            placeholder="john@example.com" 
          />
          <Input 
            label="Password" 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
            placeholder="••••••••" 
          />
          
          <Button type="submit" isLoading={isLoading} style={{ marginTop: '0.5rem' }}>
            Login to Dashboard
          </Button>
        </form>

        <div className={styles.footer}>
          Don't have an account? <Link href="/auth/register">Sign up</Link>
        </div>
      </Card>
    </div>
  );
}

'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { useLanguage } from '@/context/LanguageContext';
import apiClient from '@/lib/api.client';
import styles from '../auth.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<{ field: string, message: string }[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.id]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setValidationErrors([]);

    try {
      const response = await apiClient.post('/auth/register', formData);
      
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      if (response.data.refreshTokenExpiresAt) {
        localStorage.setItem('refreshTokenExpiresAt', response.data.refreshTokenExpiresAt);
      }

      router.push('/dashboard');
    } catch (err: any) {
      if (err.response?.data?.code === 'VALIDATION_ERROR') {
        setValidationErrors(err.response.data.details);
      } else {
        setError(err.response?.data?.error || t('auth.registerError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <Link href="/" className={styles.backLink}>
        <ArrowLeft size={16} /> {t('common.backHome')}
      </Link>
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
        <LanguageToggle compact />
      </div>
      
      <Card glass className={styles.authCard}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t('auth.registerTitle')}</h1>
          <p className={styles.subtitle}>{t('auth.registerSubtitle')}</p>
        </div>

        {error && (
          <div className={styles.errorsBanner} style={{ marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}
        
        {validationErrors.length > 0 && (
          <div className={styles.errorsBanner} style={{ marginBottom: '1.5rem' }}>
            <strong>{t('auth.validationTitle')}</strong>
            <ul>
              {validationErrors.map((err, i) => <li key={i}>{err.message}</li>)}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input 
            label={t('common.email')}
            id="email"
            type="email" 
            value={formData.email}
            onChange={handleChange}
            required 
            placeholder="john@investx.com" 
          />
          <Input 
            label={t('common.username')}
            id="username"
            type="text" 
            value={formData.username}
            onChange={handleChange}
            required 
            placeholder="johndoe" 
          />
          <Input 
            label={t('common.password')}
            id="password"
            type="password" 
            value={formData.password}
            onChange={handleChange}
            required 
            placeholder="••••••••" 
          />
          
          <Button type="submit" isLoading={isLoading} style={{ marginTop: '0.5rem' }}>
            {t('auth.registerButton')}
          </Button>
        </form>

        <div className={styles.footer}>
          {t('auth.hasAccount')} <Link href="/auth/login">{t('auth.signin')}</Link>
        </div>
      </Card>
    </div>
  );
}

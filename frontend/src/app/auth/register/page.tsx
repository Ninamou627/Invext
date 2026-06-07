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

export default function RegisterPage() {
  const router = useRouter();
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
        setError(err.response?.data?.error || 'Registration failed, please try again.');
      }
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
          <h1 className={styles.title}>Create Account</h1>
          <p className={styles.subtitle}>Start with $100,000 virtual capital</p>
        </div>

        {error && (
          <div className={styles.errorsBanner} style={{ marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}
        
        {validationErrors.length > 0 && (
          <div className={styles.errorsBanner} style={{ marginBottom: '1.5rem' }}>
            <strong>Please fix the following:</strong>
            <ul>
              {validationErrors.map((err, i) => <li key={i}>{err.message}</li>)}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input 
            label="Email" 
            id="email"
            type="email" 
            value={formData.email}
            onChange={handleChange}
            required 
            placeholder="john@investx.com" 
          />
          <Input 
            label="Username" 
            id="username"
            type="text" 
            value={formData.username}
            onChange={handleChange}
            required 
            placeholder="johndoe" 
          />
          <Input 
            label="Password" 
            id="password"
            type="password" 
            value={formData.password}
            onChange={handleChange}
            required 
            placeholder="••••••••" 
          />
          
          <Button type="submit" isLoading={isLoading} style={{ marginTop: '0.5rem' }}>
            Create Account
          </Button>
        </form>

        <div className={styles.footer}>
          Already have an account? <Link href="/auth/login">Sign in</Link>
        </div>
      </Card>
    </div>
  );
}

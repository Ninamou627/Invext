'use client';
import React from 'react';
import styles from './ui.module.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
  children: React.ReactNode;
}

export function Button({ 
  variant = 'primary', 
  isLoading = false, 
  className = '', 
  children, 
  disabled, 
  ...props 
}: ButtonProps) {
  const combinedClassName = `${styles.button} ${styles[variant]} ${className}`.trim();

  return (
    <button 
      className={combinedClassName} 
      disabled={isLoading || disabled} 
      {...props}
    >
      <span style={{ opacity: isLoading ? 0 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {children}
      </span>
      {isLoading && (
        <span className={styles.loadingIndicator}>
          <span className={styles.spinner}></span>
        </span>
      )}
    </button>
  );
}

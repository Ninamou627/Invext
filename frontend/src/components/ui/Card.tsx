import React from 'react';
import styles from './ui.module.css';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
  glow?: boolean;
  style?: React.CSSProperties;
}

export function Card({ children, className = '', glass = false, glow = false, style }: CardProps) {
  const classNames = [
    styles.card,
    glass ? styles.cardGlass : '',
    glow ? styles.cardGlow : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classNames} style={style}>
      {children}
    </div>
  );
}

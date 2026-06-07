'use client';

import React from 'react';
import { Languages } from 'lucide-react';
import { Language, useLanguage } from '@/context/LanguageContext';

interface LanguageToggleProps {
  compact?: boolean;
}

export function LanguageToggle({ compact = false }: LanguageToggleProps) {
  const { language, setLanguage, t } = useLanguage();

  const option = (value: Language, label: string) => (
    <button
      type="button"
      onClick={() => setLanguage(value)}
      aria-pressed={language === value}
      title={value === 'fr' ? t('common.french') : t('common.english')}
      style={{
        minWidth: compact ? 34 : 42,
        height: compact ? 28 : 32,
        border: 'none',
        borderRadius: 6,
        background: language === value ? 'var(--accent-primary)' : 'transparent',
        color: language === value ? 'var(--bg-base)' : 'var(--text-secondary)',
        cursor: 'pointer',
        fontWeight: 800,
        fontSize: compact ? '0.72rem' : '0.78rem',
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      aria-label={t('common.language')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? '0.25rem' : '0.35rem',
        padding: compact ? '0.2rem' : '0.25rem',
        border: '1px solid var(--border-light)',
        borderRadius: 8,
        background: 'var(--bg-surface-elevated)',
      }}
    >
      {!compact && <Languages size={16} color="var(--text-muted)" />}
      {option('fr', 'FR')}
      {option('en', 'EN')}
    </div>
  );
}

import apiClient from './api.client';

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  fallbackUsdRate: number; // 1 USD = X currency units when the FX API is unavailable
}

export interface ExchangeRatesSnapshot {
  base: 'USD';
  rates: Record<string, number>;
  fetchedAt: string | null;
  source: 'api' | 'fallback';
  currencies: Record<string, CurrencyConfig>;
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar ($)', fallbackUsdRate: 1.0 },
  EUR: { code: 'EUR', symbol: 'EUR', name: 'Euro (EUR)', fallbackUsdRate: 0.92 },
  GBP: { code: 'GBP', symbol: 'GBP', name: 'British Pound (GBP)', fallbackUsdRate: 0.79 },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CA$)', fallbackUsdRate: 1.36 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (A$)', fallbackUsdRate: 1.50 },
  JPY: { code: 'JPY', symbol: 'JPY', name: 'Japanese Yen (JPY)', fallbackUsdRate: 156.0 },
  CNY: { code: 'CNY', symbol: 'CNY', name: 'Chinese Yuan (CNY)', fallbackUsdRate: 7.24 },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc (CHF)', fallbackUsdRate: 0.91 },
  MAD: { code: 'MAD', symbol: 'DH', name: 'Moroccan Dirham (MAD)', fallbackUsdRate: 9.92 },
  GNF: { code: 'GNF', symbol: 'FG', name: 'Guinean Franc (GNF)', fallbackUsdRate: 8600.0 },
  XOF: { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc (CFA)', fallbackUsdRate: 603.5 },
};

let rateCache: Record<string, number> = Object.fromEntries(
  Object.values(CURRENCIES).map((currency) => [currency.code, currency.fallbackUsdRate])
);
let fetchedAt: string | null = null;
let source: 'api' | 'fallback' = 'fallback';

export const refreshExchangeRates = async (force = false): Promise<ExchangeRatesSnapshot> => {
  const response = await apiClient.get('/market/exchange-rates', {
    params: force ? { force: 'true' } : undefined,
  });
  const snapshot = response.data as ExchangeRatesSnapshot;

  rateCache = snapshot.rates || rateCache;
  fetchedAt = snapshot.fetchedAt;
  source = snapshot.source;

  return snapshot;
};

export const getExchangeRatesSnapshot = (): ExchangeRatesSnapshot => ({
  base: 'USD',
  rates: { ...rateCache },
  fetchedAt,
  source,
  currencies: CURRENCIES,
});

export const getCurrencySymbol = (currencyCode: string): string => {
  return CURRENCIES[currencyCode]?.symbol || '$';
};

export const convertUsdToCurrency = (amountUsd: number, targetCurrency: string): number => {
  const rate = rateCache[targetCurrency] ?? rateCache.USD;
  return amountUsd * rate;
};

export const formatCurrency = (val: number, currencyCode: string, options?: Intl.NumberFormatOptions): string => {
  const symbol = getCurrencySymbol(currencyCode);
  const formattedVal = val.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  });
  return `${formattedVal} ${symbol}`;
};

import axios from 'axios';

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
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', fallbackUsdRate: 1.0 },
  EUR: { code: 'EUR', symbol: 'EUR', name: 'Euro', fallbackUsdRate: 0.92 },
  GBP: { code: 'GBP', symbol: 'GBP', name: 'British Pound', fallbackUsdRate: 0.79 },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', fallbackUsdRate: 1.36 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', fallbackUsdRate: 1.50 },
  JPY: { code: 'JPY', symbol: 'JPY', name: 'Japanese Yen', fallbackUsdRate: 156.0 },
  CNY: { code: 'CNY', symbol: 'CNY', name: 'Chinese Yuan', fallbackUsdRate: 7.24 },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', fallbackUsdRate: 0.91 },
  MAD: { code: 'MAD', symbol: 'DH', name: 'Moroccan Dirham', fallbackUsdRate: 9.92 },
  GNF: { code: 'GNF', symbol: 'FG', name: 'Guinean Franc', fallbackUsdRate: 8600.0 },
  XOF: { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc', fallbackUsdRate: 603.5 },
};

const FX_TTL_MS = 60 * 60 * 1000;
let rateCache: Record<string, number> = Object.fromEntries(
  Object.values(CURRENCIES).map((currency) => [currency.code, currency.fallbackUsdRate])
);
let fetchedAt: Date | null = null;

export const getCurrencySymbol = (currencyCode: string): string => {
  return CURRENCIES[currencyCode]?.symbol || '$';
};

export const getExchangeRatesSnapshot = (): ExchangeRatesSnapshot => ({
  base: 'USD',
  rates: { ...rateCache },
  fetchedAt: fetchedAt?.toISOString() || null,
  source: fetchedAt ? 'api' : 'fallback',
  currencies: CURRENCIES,
});

export const refreshExchangeRates = async (force = false): Promise<ExchangeRatesSnapshot> => {
  if (!force && fetchedAt && Date.now() - fetchedAt.getTime() < FX_TTL_MS) {
    return getExchangeRatesSnapshot();
  }

  try {
    const response = await axios.get('https://open.er-api.com/v6/latest/USD', {
      timeout: 8000,
    });

    const rates = response.data?.rates || {};
    const nextRates: Record<string, number> = {};

    for (const code of Object.keys(CURRENCIES)) {
      const rate = Number(rates[code]);
      nextRates[code] = Number.isFinite(rate) && rate > 0 ? rate : CURRENCIES[code].fallbackUsdRate;
    }

    rateCache = nextRates;
    fetchedAt = new Date();

    return getExchangeRatesSnapshot();
  } catch (error: any) {
    console.warn('[FX] Failed to refresh exchange rates, using cached/fallback rates:', error.message);
    return getExchangeRatesSnapshot();
  }
};

export const convertUsdToCurrency = (amountUsd: number, targetCurrency: string): number => {
  const rate = rateCache[targetCurrency] ?? rateCache.USD;
  return amountUsd * rate;
};

export const convertCurrencyToUsd = (amount: number, sourceCurrency: string): number => {
  const rate = rateCache[sourceCurrency] ?? rateCache.USD;
  return amount / rate;
};

export const convertBetweenCurrencies = (amount: number, fromCurrency: string, toCurrency: string): number => {
  const amountUsd = convertCurrencyToUsd(amount, fromCurrency);
  return convertUsdToCurrency(amountUsd, toCurrency);
};

void refreshExchangeRates().catch(() => undefined);

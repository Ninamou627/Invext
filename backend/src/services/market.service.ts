import axios from 'axios';

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const API_KEY = process.env.FINNHUB_API_KEY || '';

export interface AssetSearchResult {
  symbol: string;
  displaySymbol: string;
  description: string;
  type: string;
  currency?: string;
  mic?: string;
}

export interface AssetSearchResponse {
  query: string;
  count: number;
  results: AssetSearchResult[];
}

interface CandlePayload {
  s: 'ok' | 'no_data';
  t: number[];
  c: number[];
  o: number[];
  h: number[];
  l: number[];
  v: number[];
}

const normalizeAsset = (asset: any): AssetSearchResult => {
  const symbol = String(asset.symbol || asset.displaySymbol || '').toUpperCase();
  const displaySymbol = String(asset.displaySymbol || asset.symbol || symbol).toUpperCase();

  return {
    symbol,
    displaySymbol,
    description: String(asset.description || asset.name || displaySymbol || 'Unknown asset'),
    type: String(asset.type || 'Unknown'),
    currency: asset.currency ? String(asset.currency).toUpperCase() : undefined,
    mic: asset.mic ? String(asset.mic).toUpperCase() : undefined,
  };
};

const fallbackSearchResults = (query: string): AssetSearchResult[] => {
  const fallbackAssets = [
    { description: 'Apple Inc', displaySymbol: 'AAPL', symbol: 'AAPL', type: 'Common Stock', currency: 'USD' },
    { description: 'Microsoft Corp', displaySymbol: 'MSFT', symbol: 'MSFT', type: 'Common Stock', currency: 'USD' },
    { description: 'Tesla Inc', displaySymbol: 'TSLA', symbol: 'TSLA', type: 'Common Stock', currency: 'USD' },
    { description: 'Nvidia Corp', displaySymbol: 'NVDA', symbol: 'NVDA', type: 'Common Stock', currency: 'USD' },
    { description: 'Alphabet Inc', displaySymbol: 'GOOGL', symbol: 'GOOGL', type: 'Common Stock', currency: 'USD' },
    { description: 'Amazon.com Inc', displaySymbol: 'AMZN', symbol: 'AMZN', type: 'Common Stock', currency: 'USD' },
    { description: 'Meta Platforms Inc', displaySymbol: 'META', symbol: 'META', type: 'Common Stock', currency: 'USD' },
    { description: 'Bitcoin / Tether', displaySymbol: 'BINANCE:BTCUSDT', symbol: 'BINANCE:BTCUSDT', type: 'Crypto', currency: 'USD' },
    { description: 'Ethereum / Tether', displaySymbol: 'BINANCE:ETHUSDT', symbol: 'BINANCE:ETHUSDT', type: 'Crypto', currency: 'USD' },
    { description: 'Solana / Tether', displaySymbol: 'BINANCE:SOLUSDT', symbol: 'BINANCE:SOLUSDT', type: 'Crypto', currency: 'USD' },
    { description: 'BNB / Tether', displaySymbol: 'BINANCE:BNBUSDT', symbol: 'BINANCE:BNBUSDT', type: 'Crypto', currency: 'USD' },
  ];

  const lowerQuery = query.toLowerCase();
  const matches = fallbackAssets.filter((asset) => {
    const haystack = `${asset.symbol} ${asset.displaySymbol} ${asset.description}`.toLowerCase();
    return haystack.includes(lowerQuery);
  });

  const results = matches.length > 0 ? matches : [{
    description: `${query.toUpperCase()} asset`,
    displaySymbol: query.toUpperCase(),
    symbol: query.toUpperCase(),
    type: 'Unknown',
    currency: 'USD',
  }];

  return results.map(normalizeAsset);
};

const mockQuote = () => {
  const mockPrice = 100 + (Math.random() * 20 - 10);
  return { c: mockPrice, h: mockPrice + 5, l: mockPrice - 5, o: mockPrice, pc: mockPrice - 2 };
};

export const getQuote = async (symbol: string) => {
  if (!API_KEY) {
    return mockQuote();
  }

  try {
    const response = await axios.get(`${FINNHUB_BASE_URL}/quote`, {
      params: {
        symbol,
        token: API_KEY
      }
    });

    // Finnhub quote: c = current price, h = high, l = low, o = open, pc = previous close
    return response.data;
  } catch (error: any) {
    console.warn(`Finnhub quote unavailable for ${symbol}; using simulated quote:`, error.message);
    return mockQuote();
  }
};

export const getCandles = async (symbol: string, resolution: string = 'D', from: number, to: number) => {
  if (!API_KEY) {
    return await getYahooCandles(symbol, resolution, from, to);
  }

  try {
    const response = await axios.get(`${FINNHUB_BASE_URL}/stock/candle`, {
      params: {
        symbol,
        resolution,
        from,
        to,
        token: API_KEY
      }
    });

    if (response.data?.s !== 'ok' || !Array.isArray(response.data?.t) || response.data.t.length === 0) {
      return await getYahooCandles(symbol, resolution, from, to);
    }

    return response.data;
  } catch (error: any) {
    console.warn(`Finnhub candles unavailable for ${symbol}; falling back to Yahoo Finance:`, error.message);
    return await getYahooCandles(symbol, resolution, from, to);
  }
};

const toYahooSymbol = (symbol: string): string => {
  const upper = symbol.toUpperCase();
  if (upper === 'BINANCE:BTCUSDT' || upper === 'BTCUSDT') return 'BTC-USD';
  if (upper === 'BINANCE:ETHUSDT' || upper === 'ETHUSDT') return 'ETH-USD';
  return upper.replace(/^NASDAQ:/, '').replace(/^NYSE:/, '');
};

const toYahooInterval = (resolution: string): string => {
  if (resolution === '1') return '1m';
  if (resolution === '5') return '5m';
  if (resolution === '15') return '15m';
  if (resolution === '60') return '1h';
  if (resolution === 'W') return '1wk';
  if (resolution === 'M') return '1mo';
  return '1d';
};

const getYahooCandles = async (symbol: string, resolution: string, from: number, to: number): Promise<CandlePayload> => {
  try {
    const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(toYahooSymbol(symbol))}`, {
      params: {
        period1: from,
        period2: to,
        interval: toYahooInterval(resolution),
        events: 'history',
      },
      timeout: 8000,
    });

    const result = response.data?.chart?.result?.[0];
    const timestamps: number[] = result?.timestamp || [];
    const quote = result?.indicators?.quote?.[0] || {};
    const close: Array<number | null> = quote.close || [];
    const open: Array<number | null> = quote.open || [];
    const high: Array<number | null> = quote.high || [];
    const low: Array<number | null> = quote.low || [];
    const volume: Array<number | null> = quote.volume || [];

    const payload: CandlePayload = {
      s: 'ok',
      t: [],
      c: [],
      o: [],
      h: [],
      l: [],
      v: [],
    };

    timestamps.forEach((time, index) => {
      const c = close[index];
      const o = open[index];
      const h = high[index];
      const l = low[index];

      if (c === null || o === null || h === null || l === null) return;

      payload.t.push(time);
      payload.c.push(c);
      payload.o.push(o);
      payload.h.push(h);
      payload.l.push(l);
      payload.v.push(volume[index] || 0);
    });

    if (payload.t.length === 0) {
      return { s: 'no_data', t: [], c: [], o: [], h: [], l: [], v: [] };
    }

    return payload;
  } catch (error: any) {
    console.error(`Yahoo candles fallback failed for ${symbol}:`, error.message);
    throw new Error('Failed to fetch historical data');
  }
};

export const searchSymbols = async (query: string): Promise<AssetSearchResponse> => {
  const normalizedQuery = query.trim();
  if (!API_KEY) {
    const mockResults = fallbackSearchResults(normalizedQuery);

    return {
      query: normalizedQuery,
      count: mockResults.length,
      results: mockResults,
    };
  }

  try {
    const response = await axios.get(`${FINNHUB_BASE_URL}/search`, {
      params: {
        q: normalizedQuery,
        token: API_KEY
      },
      timeout: 8000,
    });

    const rawResults = Array.isArray(response.data?.result) ? response.data.result : [];
    const results = rawResults
      .map(normalizeAsset)
      .filter((asset: AssetSearchResult) => asset.symbol && asset.description)
      .slice(0, 12);

    return {
      query: normalizedQuery,
      count: results.length,
      results,
    };
  } catch (error: any) {
    console.warn(`Finnhub search unavailable for ${query}; using fallback results:`, error.message);
    const results = fallbackSearchResults(normalizedQuery);
    return {
      query: normalizedQuery,
      count: results.length,
      results,
    };
  }
};

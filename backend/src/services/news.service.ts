import axios from 'axios';
import { analyseArticle, aggregateSentiment, AggregatedSentiment } from './sentiment.service';
import { env } from '../config/env';

const FINNHUB_BASE = 'https://finnhub.io/api/v1';

// ─── In-memory cache to avoid hitting Finnhub rate limits ────────────────────
const cache = new Map<string, { data: AggregatedSentiment; fetchedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const getNewsSentiment = async (ticker: string): Promise<AggregatedSentiment> => {
  const cacheKey = ticker.toUpperCase();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  // Fetch last 7 days of company news from Finnhub
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 7);

  const toStr = to.toISOString().split('T')[0];
  const fromStr = from.toISOString().split('T')[0];

  const url = `${FINNHUB_BASE}/company-news?symbol=${cacheKey}&from=${fromStr}&to=${toStr}&token=${env.FINNHUB_API_KEY}`;

  let articles: any[] = [];
  try {
    const response = await axios.get(url, { timeout: 8000 });
    articles = Array.isArray(response.data) ? response.data.slice(0, 20) : [];
  } catch (error) {
    console.error(`[news.service] Failed to fetch news for ${ticker}:`, error);
    articles = [];
  }

  if (articles.length === 0) {
    articles = await fetchYahooNews(cacheKey);
  }

  // Run full NLP pipeline on each article
  const analysed = articles
    .filter(a => a.headline && a.headline.length > 5)
    .map(a => analyseArticle({
      headline: a.headline || '',
      summary: a.summary || '',
      source: a.source || '',
      url: a.url || '',
      datetime: a.datetime || 0,
    }));

  const result = aggregateSentiment(analysed);

  cache.set(cacheKey, { data: result, fetchedAt: Date.now() });
  return result;
};

const decodeXml = (value: string): string => {
  return value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
};

const extractTag = (item: string, tag: string): string => {
  const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeXml(match[1]) : '';
};

const fetchYahooNews = async (ticker: string) => {
  try {
    const response = await axios.get('https://feeds.finance.yahoo.com/rss/2.0/headline', {
      params: {
        s: ticker,
        region: 'US',
        lang: 'en-US',
      },
      timeout: 8000,
      responseType: 'text',
    });

    const xml = String(response.data || '');
    const items = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

    return items.slice(0, 20).map((item) => {
      const pubDate = extractTag(item, 'pubDate');
      const publishedAt = pubDate ? Math.floor(new Date(pubDate).getTime() / 1000) : Math.floor(Date.now() / 1000);

      return {
        headline: extractTag(item, 'title'),
        summary: extractTag(item, 'description'),
        source: 'Yahoo Finance',
        url: extractTag(item, 'link'),
        datetime: Number.isFinite(publishedAt) ? publishedAt : Math.floor(Date.now() / 1000),
      };
    }).filter((article) => article.headline.length > 5);
  } catch (error) {
    console.error(`[news.service] Yahoo fallback failed for ${ticker}:`, error);
    return [];
  }
};

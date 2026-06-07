import { AssetDetailClient } from './AssetDetailClient';

const STATIC_ASSET_SYMBOLS = [
  'BINANCE:BTCUSDT',
  'BINANCE:ETHUSDT',
  'BINANCE:SOLUSDT',
  'BINANCE:BNBUSDT',
  'AAPL',
  'MSFT',
  'TSLA',
  'NVDA',
  'GOOGL',
  'AMZN',
  'META',
];

export const dynamicParams = false;

export function generateStaticParams() {
  return STATIC_ASSET_SYMBOLS.map((symbol) => ({ symbol: encodeURIComponent(symbol) }));
}

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;

  return <AssetDetailClient symbol={decodeURIComponent(symbol).toUpperCase()} />;
}

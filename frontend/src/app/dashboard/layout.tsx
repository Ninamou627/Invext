'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Trophy, 
  Wallet,
  LogOut,
  Bell,
  ChevronLeft,
  ChevronRight,
  Settings,
  PieChart
} from 'lucide-react';
import styles from './dashboard.module.css';
import apiClient from '@/lib/api.client';
import { MarketProvider, useMarket } from '@/context/MarketContext';
import { Search } from 'lucide-react';
import { AlertNotifier } from '@/components/ui/AlertNotifier';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { useLanguage } from '@/context/LanguageContext';
import { convertUsdToCurrency, formatCurrency, refreshExchangeRates } from '@/lib/currency';

type AssetOption = {
  symbol: string;
  displaySymbol: string;
  description: string;
  type: string;
  currency?: string;
};

const MARKET_SHORTCUTS: AssetOption[] = [
  { symbol: 'BINANCE:BTCUSDT', displaySymbol: 'BTC/USDT', description: 'Bitcoin / TetherUS', type: 'Binance', currency: 'USD' },
  { symbol: 'BINANCE:ETHUSDT', displaySymbol: 'ETH/USDT', description: 'Ethereum / TetherUS', type: 'Binance', currency: 'USD' },
  { symbol: 'BINANCE:SOLUSDT', displaySymbol: 'SOL/USDT', description: 'Solana / TetherUS', type: 'Binance', currency: 'USD' },
  { symbol: 'AAPL', displaySymbol: 'AAPL', description: 'Apple Inc', type: 'NASDAQ', currency: 'USD' },
  { symbol: 'MSFT', displaySymbol: 'MSFT', description: 'Microsoft Corp', type: 'NASDAQ', currency: 'USD' },
  { symbol: 'TSLA', displaySymbol: 'TSLA', description: 'Tesla Inc', type: 'NASDAQ', currency: 'USD' },
];

function DashboardHeader({ user, profile }: { user: any, profile: any }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const { activeSymbol, setActiveSymbol, price, direction } = useMarket();
  const [input, setInput] = useState(activeSymbol);
  const [searchResults, setSearchResults] = useState<AssetOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [prevCash, setPrevCash] = useState<number | null>(null);
  const [flash, setFlash] = useState<'green' | 'red' | null>(null);
  const [diffAmount, setDiffAmount] = useState<number | null>(null);
  const [diffKey, setDiffKey] = useState(0);

  useEffect(() => {
    if (user?.cashBalance !== undefined) {
      const currentCash = Number(user.cashBalance);
      if (prevCash !== null && currentCash !== prevCash) {
        const diff = currentCash - prevCash;
        if (currentCash > prevCash) {
          setFlash('green');
        } else {
          setFlash('red');
        }
        setDiffAmount(diff);
        setDiffKey(k => k + 1);
        const timer = setTimeout(() => {
          setFlash(null);
          setDiffAmount(null);
        }, 2000);
        setPrevCash(currentCash);
        return () => clearTimeout(timer);
      } else if (prevCash === null) {
        setPrevCash(currentCash);
      }
    }
  }, [user?.cashBalance, prevCash]);

  useEffect(() => {
    if (!isSearchFocused) {
      setInput(activeSymbol);
    }
  }, [activeSymbol, isSearchFocused]);

  useEffect(() => {
    const query = input.trim();

    if (!isSearchFocused) {
      setShowResults(false);
      setIsSearching(false);
      return;
    }

    if (query.length < 1) {
      setSearchResults([]);
      setShowResults(true);
      setIsSearching(false);
      return;
    }

    let active = true;
    const timeout = setTimeout(async () => {
      setShowResults(true);
      setIsSearching(true);
      try {
        const response = await apiClient.get('/market/search', { params: { query } });
        if (!active) return;
        setSearchResults(response.data.results || []);
        setShowResults(true);
      } catch {
        if (active) {
          setSearchResults([]);
          setShowResults(true);
        }
      } finally {
        if (active) setIsSearching(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [input, isSearchFocused]);

  const selectAsset = (asset: { symbol: string; displaySymbol?: string }) => {
    const symbol = asset.symbol.toUpperCase();
    setActiveSymbol(symbol);
    setInput(symbol);
    setSearchResults([]);
    setIsSearchFocused(false);
    setShowResults(false);

    if (pathname.startsWith('/dashboard/assets/')) {
      router.push(`/dashboard/assets/${encodeURIComponent(symbol)}`);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const firstResult = searchResults[0];
    if (firstResult) {
      selectAsset(firstResult);
      return;
    }

    const symbol = input.trim().toUpperCase();
    if (symbol) {
      selectAsset({ symbol });
    }
  };

  const getPriceColor = () => {
    if (direction === 'up') return 'var(--accent-success)';
    if (direction === 'down') return 'var(--accent-danger)';
    return 'var(--text-primary)';
  };

  const displayPrice = price !== null
    ? convertUsdToCurrency(price, profile?.preferredCurrency || 'USD')
    : null;

  const query = input.trim();

  return (
    <header className={styles.header}>
      {/* Central Search Bar */}
      <div className={styles.headerSearch}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <Search size={16} className={styles.searchIcon} />
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => {
              setIsSearchFocused(true);
              setShowResults(true);
            }}
            onBlur={() => {
              setIsSearchFocused(false);
              setTimeout(() => setShowResults(false), 150);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowResults(false);
                e.currentTarget.blur();
              }
            }}
            placeholder={t('search.placeholder')}
            className={styles.headerInput}
          />
        </form>
        {showResults && (
          <div className={styles.searchResults}>
            <div className={styles.marketShortcuts}>
              <div className={styles.shortcutLabel}>{t('search.quickMarkets')}</div>
              <div className={styles.shortcutGrid}>
                {MARKET_SHORTCUTS.map((asset) => (
                  <button
                    key={asset.symbol}
                    type="button"
                    className={`${styles.marketShortcut} ${activeSymbol === asset.symbol ? styles.marketShortcutActive : ''}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectAsset(asset)}
                  >
                    <span>{asset.displaySymbol}</span>
                    <small>{asset.type}</small>
                  </button>
                ))}
              </div>
            </div>

            {isSearching ? (
              <div className={styles.searchState}>{t('search.searching')}</div>
            ) : searchResults.length === 0 && query.length > 0 ? (
              <div className={styles.searchState}>{t('search.noAssets')}</div>
            ) : (
              searchResults.map((asset) => (
                <button
                  key={`${asset.symbol}-${asset.type}`}
                  type="button"
                  className={styles.searchResult}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectAsset(asset)}
                >
                  <span className={styles.resultSymbol}>{asset.displaySymbol || asset.symbol}</span>
                  <span className={styles.resultDescription}>{asset.description}</span>
                  <span className={styles.resultMeta}>{asset.type}{asset.currency ? ` - ${asset.currency}` : ''}</span>
                </button>
              ))
            )}
          </div>
        )}
        {displayPrice !== null && (
          <div className={styles.headerPrice} style={{ color: getPriceColor() }}>
            {formatCurrency(displayPrice, profile?.preferredCurrency || 'USD')}
          </div>
        )}
      </div>

      <div className={styles.userBadge}>
        {profile?.avatarUrl ? (
          <img src={profile.avatarUrl} alt="Avatar" className={styles.userAvatarImage} />
        ) : (
          <div className={styles.userAvatar}>{profile?.username ? profile.username[0].toUpperCase() : 'U'}</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{profile?.username || 'User'}</span>
          <span style={{ position: 'relative' }} className={flash === 'green' ? styles.flashGreen : flash === 'red' ? styles.flashRed : ''}>
            {t('common.capital')}: {formatCurrency(Number(user?.cashBalance) || 100000, profile?.preferredCurrency || 'USD')}
            {diffAmount !== null && (
              <span
                key={diffKey}
                className={diffAmount > 0 ? styles.diffNoteGreen : styles.diffNoteRed}
              >
                {diffAmount > 0 ? '+' : '-'}{formatCurrency(Math.abs(diffAmount), profile?.preferredCurrency || 'USD')}
              </span>
            )}
          </span>
        </div>
      </div>
    </header>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [, setRatesLoadedAt] = useState(0);

  useEffect(() => {
    refreshExchangeRates()
      .then(() => setRatesLoadedAt(Date.now()))
      .catch((error) => console.error('Failed to refresh exchange rates', error));

    const fetchData = async () => {
      try {
        const [portfolioRes, profileRes] = await Promise.all([
          apiClient.get('/portfolio/dashboard'),
          apiClient.get('/user/profile')
        ]);
        
        setUser(portfolioRes.data);
        setProfile(profileRes.data);
      } catch {
        // Redirect to login if unauthorized
        router.push('/auth/login');
      }
    };

    fetchData();

    // Listen to custom update-portfolio event to refresh user data when trades occur
    if (typeof window !== 'undefined') {
      window.addEventListener('update-portfolio', fetchData);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('update-portfolio', fetchData);
      }
    };
  }, [router]);

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await apiClient.post('/auth/logout', { refreshToken });
      } catch (error) {
        console.error('Failed to revoke refresh token during logout', error);
      }
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('refreshTokenExpiresAt');
    router.push('/');
  };

  if (!user) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  return (
    <MarketProvider>
      <div className={`${styles.layout} ${isCollapsed ? styles.collapsedLayout : ''}`}>
        {/* Sidebar */}
        <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
          <div className={styles.sidebarHeader}>
            <Link href="/dashboard" className={styles.brand}>
              <div className={styles.brandIcon}></div>
              {!isCollapsed && <span>InvestX</span>}
            </Link>
            <button 
              className={styles.toggleBtn} 
              onClick={() => setIsCollapsed(!isCollapsed)}
              aria-label="Toggle Sidebar"
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>

          <nav className={styles.navLinks}>
            <Link 
              href="/dashboard/overview" 
              className={`${styles.navItem} ${pathname === '/dashboard/overview' ? styles.active : ''}`}
              title={isCollapsed ? t('nav.overview') : ""}
            >
              <PieChart size={20} />
              {!isCollapsed && <span>{t('nav.overview')}</span>}
            </Link>
            <Link 
              href="/dashboard" 
              className={`${styles.navItem} ${pathname === '/dashboard' ? styles.active : ''}`}
              title={isCollapsed ? t('nav.terminal') : ""}
            >
              <LayoutDashboard size={20} />
              {!isCollapsed && <span>{t('nav.terminal')}</span>}
            </Link>
            <Link 
              href="/dashboard/history" 
              className={`${styles.navItem} ${pathname === '/dashboard/history' ? styles.active : ''}`}
              title={isCollapsed ? t('nav.history') : ""}
            >
              <Wallet size={20} />
              {!isCollapsed && <span>{t('nav.history')}</span>}
            </Link>
            <Link 
              href="/dashboard/alerts" 
              className={`${styles.navItem} ${pathname === '/dashboard/alerts' ? styles.active : ''}`}
              title={isCollapsed ? t('nav.alerts') : ""}
            >
              <Bell size={20} />
              {!isCollapsed && <span>{t('nav.alerts')}</span>}
            </Link>
            <Link 
              href="/dashboard/leaderboard" 
              className={`${styles.navItem} ${pathname === '/dashboard/leaderboard' ? styles.active : ''}`}
              title={isCollapsed ? t('nav.leaderboard') : ""}
            >
              <Trophy size={20} />
              {!isCollapsed && <span>{t('nav.leaderboard')}</span>}
            </Link>
            <Link 
              href="/dashboard/profile" 
              className={`${styles.navItem} ${pathname === '/dashboard/profile' ? styles.active : ''}`}
              title={isCollapsed ? t('nav.settings') : ""}
            >
              <Settings size={20} />
              {!isCollapsed && <span>{t('nav.settings')}</span>}
            </Link>
          </nav>

          <div className={styles.sidebarLanguage}>
            <LanguageToggle compact />
          </div>

          <button className={styles.logoutBtn} onClick={handleLogout} title={isCollapsed ? t('nav.logout') : ""}>
            <LogOut size={20} />
            {!isCollapsed && <span>{t('nav.logout')}</span>}
          </button>
        </aside>

        {/* Main Content */}
        <main className={styles.mainContent}>
          <DashboardHeader user={user} profile={profile} />

          <div className={styles.contentWrapper}>
            {children}
          </div>
        </main>
      </div>
      <AlertNotifier />
    </MarketProvider>
  );
}

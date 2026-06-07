'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'en' | 'fr';

type TranslationKey =
  | 'common.backHome'
  | 'common.email'
  | 'common.password'
  | 'common.username'
  | 'common.loading'
  | 'common.capital'
  | 'common.language'
  | 'common.french'
  | 'common.english'
  | 'home.login'
  | 'home.startTrading'
  | 'home.titleBefore'
  | 'home.titleHighlight'
  | 'home.subtitle'
  | 'home.openAccount'
  | 'home.explore'
  | 'home.fastTitle'
  | 'home.fastText'
  | 'home.analyticsTitle'
  | 'home.analyticsText'
  | 'home.riskTitle'
  | 'home.riskText'
  | 'auth.loginTitle'
  | 'auth.loginSubtitle'
  | 'auth.loginButton'
  | 'auth.loginError'
  | 'auth.noAccount'
  | 'auth.signup'
  | 'auth.registerTitle'
  | 'auth.registerSubtitle'
  | 'auth.registerButton'
  | 'auth.registerError'
  | 'auth.validationTitle'
  | 'auth.hasAccount'
  | 'auth.signin'
  | 'nav.overview'
  | 'nav.terminal'
  | 'nav.history'
  | 'nav.alerts'
  | 'nav.leaderboard'
  | 'nav.settings'
  | 'nav.logout'
  | 'search.placeholder'
  | 'search.quickMarkets'
  | 'search.searching'
  | 'search.noAssets'
  | 'dashboard.tradingTerminal'
  | 'dashboard.openPositions'
  | 'dashboard.loadingPositions'
  | 'dashboard.noHoldings'
  | 'dashboard.quantityShort'
  | 'dashboard.average'
  | 'dashboard.now'
  | 'trade.buy'
  | 'trade.sell'
  | 'trade.market'
  | 'trade.limit'
  | 'trade.marketPrice'
  | 'trade.limitPrice'
  | 'trade.quantity'
  | 'trade.estimatedTotal'
  | 'trade.loadingPrice'
  | 'trade.pendingOrders'
  | 'trade.asset'
  | 'trade.side'
  | 'trade.price'
  | 'trade.filled'
  | 'trade.action'
  | 'trade.cancel'
  | 'trade.successMarket'
  | 'trade.successLimit'
  | 'trade.error'
  | 'orderbook.title'
  | 'orderbook.loading'
  | 'orderbook.price'
  | 'orderbook.size'
  | 'orderbook.noAsks'
  | 'orderbook.noBids'
  | 'orderbook.spread'
  | 'orderbook.noSpread'
  | 'overview.title'
  | 'overview.subtitle'
  | 'overview.totalValue'
  | 'overview.cash'
  | 'overview.totalPL'
  | 'overview.allTime'
  | 'overview.accountEvolution'
  | 'overview.notEnoughData'
  | 'history.title'
  | 'history.subtitle'
  | 'history.loading'
  | 'history.empty'
  | 'history.date'
  | 'history.type'
  | 'history.quantity'
  | 'history.total'
  | 'history.page'
  | 'history.previous'
  | 'history.next'
  | 'alerts.title'
  | 'alerts.subtitle'
  | 'alerts.create'
  | 'alerts.symbol'
  | 'alerts.condition'
  | 'alerts.above'
  | 'alerts.below'
  | 'alerts.targetPrice'
  | 'alerts.creating'
  | 'alerts.set'
  | 'alerts.yours'
  | 'alerts.loading'
  | 'alerts.empty'
  | 'alerts.target'
  | 'alerts.status'
  | 'alerts.created'
  | 'alerts.triggered'
  | 'alerts.active'
  | 'alerts.delete'
  | 'leaderboard.title'
  | 'leaderboard.loading'
  | 'leaderboard.empty'
  | 'profile.title'
  | 'profile.subtitle'
  | 'profile.personal'
  | 'profile.nickname'
  | 'profile.currency'
  | 'profile.saving'
  | 'profile.save'
  | 'profile.avatarUpload'
  | 'profile.supportedFormats'
  | 'profile.uploading'
  | 'profile.updateAvatar'
  | 'profile.security'
  | 'profile.currentPassword'
  | 'profile.newPassword'
  | 'profile.confirmPassword'
  | 'profile.checkingPassword'
  | 'profile.passwordIncorrect'
  | 'profile.passwordCorrect'
  | 'profile.passwordsMismatch'
  | 'profile.passwordsMatch'
  | 'profile.changing'
  | 'profile.changePassword'
  | 'profile.logoutAll'
  | 'profile.loading'
  | 'asset.subtitle'
  | 'asset.livePrice'
  | 'asset.up'
  | 'asset.down'
  | 'asset.live'
  | 'asset.loading'
  | 'asset.snapshot'
  | 'asset.current'
  | 'asset.open'
  | 'asset.high'
  | 'asset.low'
  | 'asset.previousClose'
  | 'notifier.title'
  | 'notifier.body';

const translations: Record<Language, Record<TranslationKey, string>> = {
  en: {
    'common.backHome': 'Back to Home',
    'common.email': 'Email',
    'common.password': 'Password',
    'common.username': 'Username',
    'common.loading': 'Loading...',
    'common.capital': 'Capital',
    'common.language': 'Language',
    'common.french': 'French',
    'common.english': 'English',
    'home.login': 'Log In',
    'home.startTrading': 'Start Trading',
    'home.titleBefore': 'The Next Generation of',
    'home.titleHighlight': 'Simulated Trading',
    'home.subtitle': 'Experience real-time market action with a powerful, fast, and beautiful platform. Start with $100,000 and build your empire without risking a dime.',
    'home.openAccount': 'Open Free Account',
    'home.explore': 'Explore Platform',
    'home.fastTitle': 'Lightning Fast',
    'home.fastText': 'Real-time data streams and atomic transaction processing for instant execution.',
    'home.analyticsTitle': 'Pro Analytics',
    'home.analyticsText': 'Deep dive into your portfolio performance with advanced charting and dynamic snapshots.',
    'home.riskTitle': '100% Risk Free',
    'home.riskText': 'Practice trading strategies in a simulated environment mirroring real market conditions.',
    'auth.loginTitle': 'Welcome Back',
    'auth.loginSubtitle': 'Enter your credentials to access your account',
    'auth.loginButton': 'Login to Dashboard',
    'auth.loginError': 'Failed to login, please try again.',
    'auth.noAccount': "Don't have an account?",
    'auth.signup': 'Sign up',
    'auth.registerTitle': 'Create Account',
    'auth.registerSubtitle': 'Start with $100,000 virtual capital',
    'auth.registerButton': 'Create Account',
    'auth.registerError': 'Registration failed, please try again.',
    'auth.validationTitle': 'Please fix the following:',
    'auth.hasAccount': 'Already have an account?',
    'auth.signin': 'Sign in',
    'nav.overview': 'Overview',
    'nav.terminal': 'O-P Terminal',
    'nav.history': 'History',
    'nav.alerts': 'Alerts',
    'nav.leaderboard': 'Leaderboard',
    'nav.settings': 'Settings',
    'nav.logout': 'Logout',
    'search.placeholder': 'Search symbol...',
    'search.quickMarkets': 'Quick markets',
    'search.searching': 'Searching...',
    'search.noAssets': 'No assets found',
    'dashboard.tradingTerminal': 'Trading Terminal',
    'dashboard.openPositions': 'Open Positions',
    'dashboard.loadingPositions': 'Loading positions...',
    'dashboard.noHoldings': 'Your portfolio has no holdings yet.',
    'dashboard.quantityShort': 'Qty',
    'dashboard.average': 'Avg',
    'dashboard.now': 'Now',
    'trade.buy': 'Buy',
    'trade.sell': 'Sell',
    'trade.market': 'Market',
    'trade.limit': 'Limit',
    'trade.marketPrice': 'Price (Market)',
    'trade.limitPrice': 'Limit Price',
    'trade.quantity': 'Quantity (Shares)',
    'trade.estimatedTotal': 'Estimated Total:',
    'trade.loadingPrice': 'Loading...',
    'trade.pendingOrders': 'Pending Orders',
    'trade.asset': 'Asset',
    'trade.side': 'Side',
    'trade.price': 'Price',
    'trade.filled': 'Filled',
    'trade.action': 'Action',
    'trade.cancel': 'Cancel',
    'trade.successMarket': 'Market {side} order executed successfully!',
    'trade.successLimit': 'Limit {side} order placed at {price}.',
    'trade.error': 'Failed to place {side} order.',
    'orderbook.title': 'Order Book',
    'orderbook.loading': 'Loading depth...',
    'orderbook.price': 'Price',
    'orderbook.size': 'Size',
    'orderbook.noAsks': 'No asks',
    'orderbook.noBids': 'No bids',
    'orderbook.spread': 'Spread',
    'orderbook.noSpread': 'No Spread',
    'overview.title': 'Overview',
    'overview.subtitle': 'Track the overall performance of your portfolio.',
    'overview.totalValue': 'Total Value',
    'overview.cash': 'Available Cash',
    'overview.totalPL': 'Total Profit / Loss',
    'overview.allTime': 'All time',
    'overview.accountEvolution': 'Account Evolution (Last 30 Days)',
    'overview.notEnoughData': 'Not enough data to generate the chart.',
    'history.title': 'Transaction History',
    'history.subtitle': 'Review your past trades and financial activity.',
    'history.loading': 'Loading history...',
    'history.empty': 'No transactions found.',
    'history.date': 'Date',
    'history.type': 'Type',
    'history.quantity': 'Quantity',
    'history.total': 'Total',
    'history.page': 'Page {page} of {totalPages}',
    'history.previous': 'Previous',
    'history.next': 'Next',
    'alerts.title': 'Price Alerts',
    'alerts.subtitle': 'Set custom thresholds to be notified when assets reach your target price.',
    'alerts.create': 'Create New Alert',
    'alerts.symbol': 'Asset Symbol (Ticker)',
    'alerts.condition': 'Condition',
    'alerts.above': 'Goes Above (>=)',
    'alerts.below': 'Goes Below (<=)',
    'alerts.targetPrice': 'Target Price',
    'alerts.creating': 'Creating...',
    'alerts.set': 'Set Alert',
    'alerts.yours': 'Your Alerts',
    'alerts.loading': 'Loading alerts...',
    'alerts.empty': 'No alerts configured.',
    'alerts.target': 'Target',
    'alerts.status': 'Status',
    'alerts.created': 'Created',
    'alerts.triggered': 'Triggered',
    'alerts.active': 'Active',
    'alerts.delete': 'Delete alert',
    'leaderboard.title': 'Global Rankings',
    'leaderboard.loading': 'Loading competitive rankings...',
    'leaderboard.empty': 'No trading data available yet.',
    'profile.title': 'Profile Settings',
    'profile.subtitle': 'Manage your account details and security preferences.',
    'profile.personal': 'Personal Information',
    'profile.nickname': 'Username',
    'profile.currency': 'Preferred Currency',
    'profile.saving': 'Saving...',
    'profile.save': 'Save information',
    'profile.avatarUpload': 'Upload from computer',
    'profile.supportedFormats': 'Supported formats: JPEG, PNG, WEBP.',
    'profile.uploading': 'Uploading...',
    'profile.updateAvatar': 'Update avatar',
    'profile.security': 'Security',
    'profile.currentPassword': 'Current Password',
    'profile.newPassword': 'New Password',
    'profile.confirmPassword': 'Confirm New Password',
    'profile.checkingPassword': 'Checking password...',
    'profile.passwordIncorrect': 'Current password is incorrect.',
    'profile.passwordCorrect': 'Password is correct.',
    'profile.passwordsMismatch': 'Passwords do not match.',
    'profile.passwordsMatch': 'Passwords match.',
    'profile.changing': 'Changing...',
    'profile.changePassword': 'Change password',
    'profile.logoutAll': 'Close all sessions',
    'profile.loading': 'Loading profile...',
    'asset.subtitle': 'Asset details, live price and order entry.',
    'asset.livePrice': '{status} price',
    'asset.up': 'Up',
    'asset.down': 'Down',
    'asset.live': 'Live',
    'asset.loading': 'Loading asset details...',
    'asset.snapshot': 'Market Snapshot',
    'asset.current': 'Current',
    'asset.open': 'Open',
    'asset.high': 'High',
    'asset.low': 'Low',
    'asset.previousClose': 'Previous Close',
    'notifier.title': 'Price Alert Triggered!',
    'notifier.body': '{ticker} has gone {condition} your target of {price}.',
  },
  fr: {
    'common.backHome': "Retour a l'accueil",
    'common.email': 'Email',
    'common.password': 'Mot de passe',
    'common.username': "Nom d'utilisateur",
    'common.loading': 'Chargement...',
    'common.capital': 'Capital',
    'common.language': 'Langue',
    'common.french': 'Francais',
    'common.english': 'Anglais',
    'home.login': 'Connexion',
    'home.startTrading': 'Commencer a trader',
    'home.titleBefore': 'La nouvelle generation du',
    'home.titleHighlight': 'trading simule',
    'home.subtitle': 'Vivez les marches en temps reel avec une plateforme puissante, rapide et elegante. Commencez avec 100 000 $ virtuels et progressez sans risquer votre argent.',
    'home.openAccount': 'Ouvrir un compte gratuit',
    'home.explore': 'Explorer la plateforme',
    'home.fastTitle': 'Ultra rapide',
    'home.fastText': 'Flux de donnees en temps reel et traitement des transactions pour une execution instantanee.',
    'home.analyticsTitle': 'Analyses pro',
    'home.analyticsText': 'Analysez la performance de votre portefeuille avec des graphiques avances et des snapshots dynamiques.',
    'home.riskTitle': '100% sans risque',
    'home.riskText': 'Testez vos strategies de trading dans un environnement simule proche des conditions reelles.',
    'auth.loginTitle': 'Bon retour',
    'auth.loginSubtitle': 'Entrez vos identifiants pour acceder a votre compte',
    'auth.loginButton': 'Acceder au dashboard',
    'auth.loginError': 'Connexion impossible, veuillez reessayer.',
    'auth.noAccount': "Vous n'avez pas de compte ?",
    'auth.signup': "S'inscrire",
    'auth.registerTitle': 'Creer un compte',
    'auth.registerSubtitle': 'Commencez avec 100 000 $ de capital virtuel',
    'auth.registerButton': 'Creer le compte',
    'auth.registerError': 'Inscription impossible, veuillez reessayer.',
    'auth.validationTitle': 'Veuillez corriger les points suivants :',
    'auth.hasAccount': 'Vous avez deja un compte ?',
    'auth.signin': 'Se connecter',
    'nav.overview': "Vue d'ensemble",
    'nav.terminal': 'Terminal O-P',
    'nav.history': 'Historique',
    'nav.alerts': 'Alertes',
    'nav.leaderboard': 'Classement',
    'nav.settings': 'Parametres',
    'nav.logout': 'Deconnexion',
    'search.placeholder': 'Rechercher un symbole...',
    'search.quickMarkets': 'Marches rapides',
    'search.searching': 'Recherche...',
    'search.noAssets': 'Aucun marche trouve',
    'dashboard.tradingTerminal': 'Terminal de trading',
    'dashboard.openPositions': 'Positions ouvertes',
    'dashboard.loadingPositions': 'Chargement des positions...',
    'dashboard.noHoldings': "Votre portefeuille n'a pas encore de positions.",
    'dashboard.quantityShort': 'Qte',
    'dashboard.average': 'Moy.',
    'dashboard.now': 'Actuel',
    'trade.buy': 'Acheter',
    'trade.sell': 'Vendre',
    'trade.market': 'Marche',
    'trade.limit': 'Limite',
    'trade.marketPrice': 'Prix (Marche)',
    'trade.limitPrice': 'Prix limite',
    'trade.quantity': 'Quantite (actions)',
    'trade.estimatedTotal': 'Total estime :',
    'trade.loadingPrice': 'Chargement...',
    'trade.pendingOrders': 'Ordres en attente',
    'trade.asset': 'Actif',
    'trade.side': 'Sens',
    'trade.price': 'Prix',
    'trade.filled': 'Execute',
    'trade.action': 'Action',
    'trade.cancel': 'Annuler',
    'trade.successMarket': 'Ordre {side} au marche execute avec succes !',
    'trade.successLimit': 'Ordre limite {side} place a {price}.',
    'trade.error': "Echec de l'ordre {side}.",
    'orderbook.title': "Carnet d'ordres",
    'orderbook.loading': 'Chargement de la profondeur...',
    'orderbook.price': 'Prix',
    'orderbook.size': 'Taille',
    'orderbook.noAsks': 'Aucune vente',
    'orderbook.noBids': 'Aucun achat',
    'orderbook.spread': 'Spread',
    'orderbook.noSpread': 'Pas de spread',
    'overview.title': "Vue d'ensemble",
    'overview.subtitle': 'Suivez la performance globale de votre portefeuille.',
    'overview.totalValue': 'Valeur totale',
    'overview.cash': 'Cash disponible',
    'overview.totalPL': 'Profit / perte total',
    'overview.allTime': 'Tous les temps',
    'overview.accountEvolution': 'Evolution du compte (30 derniers jours)',
    'overview.notEnoughData': 'Pas assez de donnees pour generer le graphique.',
    'history.title': 'Historique des transactions',
    'history.subtitle': 'Consultez vos trades passes et votre activite financiere.',
    'history.loading': "Chargement de l'historique...",
    'history.empty': 'Aucune transaction trouvee.',
    'history.date': 'Date',
    'history.type': 'Type',
    'history.quantity': 'Quantite',
    'history.total': 'Total',
    'history.page': 'Page {page} sur {totalPages}',
    'history.previous': 'Precedent',
    'history.next': 'Suivant',
    'alerts.title': 'Alertes de prix',
    'alerts.subtitle': 'Definissez des seuils pour etre notifie quand un actif atteint votre prix cible.',
    'alerts.create': 'Creer une alerte',
    'alerts.symbol': "Symbole de l'actif (ticker)",
    'alerts.condition': 'Condition',
    'alerts.above': 'Passe au-dessus (>=)',
    'alerts.below': 'Passe en dessous (<=)',
    'alerts.targetPrice': 'Prix cible',
    'alerts.creating': 'Creation...',
    'alerts.set': "Creer l'alerte",
    'alerts.yours': 'Vos alertes',
    'alerts.loading': 'Chargement des alertes...',
    'alerts.empty': 'Aucune alerte configuree.',
    'alerts.target': 'Cible',
    'alerts.status': 'Statut',
    'alerts.created': 'Creee',
    'alerts.triggered': 'Declenchee',
    'alerts.active': 'Active',
    'alerts.delete': "Supprimer l'alerte",
    'leaderboard.title': 'Classement global',
    'leaderboard.loading': 'Chargement du classement...',
    'leaderboard.empty': 'Aucune donnee de trading disponible pour le moment.',
    'profile.title': 'Parametres du profil',
    'profile.subtitle': 'Gerez les informations de votre compte et vos preferences de securite.',
    'profile.personal': 'Informations personnelles',
    'profile.nickname': "Nom d'utilisateur",
    'profile.currency': 'Devise preferee',
    'profile.saving': 'Sauvegarde...',
    'profile.save': 'Sauvegarder les infos',
    'profile.avatarUpload': "Upload depuis l'ordinateur",
    'profile.supportedFormats': 'Formats supportes : JPEG, PNG, WEBP.',
    'profile.uploading': 'Upload en cours...',
    'profile.updateAvatar': "Mettre a jour l'avatar",
    'profile.security': 'Securite',
    'profile.currentPassword': 'Mot de passe actuel',
    'profile.newPassword': 'Nouveau mot de passe',
    'profile.confirmPassword': 'Confirmer le nouveau mot de passe',
    'profile.checkingPassword': 'Verification du mot de passe...',
    'profile.passwordIncorrect': 'Mot de passe actuel incorrect.',
    'profile.passwordCorrect': 'Mot de passe correct.',
    'profile.passwordsMismatch': 'Les mots de passe ne correspondent pas.',
    'profile.passwordsMatch': 'Les mots de passe correspondent.',
    'profile.changing': 'Modification...',
    'profile.changePassword': 'Changer le mot de passe',
    'profile.logoutAll': 'Fermer toutes les sessions',
    'profile.loading': 'Chargement du profil...',
    'asset.subtitle': "Details de l'actif, prix en direct et saisie d'ordre.",
    'asset.livePrice': 'Prix {status}',
    'asset.up': 'en hausse',
    'asset.down': 'en baisse',
    'asset.live': 'live',
    'asset.loading': "Chargement de l'actif...",
    'asset.snapshot': 'Instantane du marche',
    'asset.current': 'Actuel',
    'asset.open': 'Ouverture',
    'asset.high': 'Haut',
    'asset.low': 'Bas',
    'asset.previousClose': 'Cloture precedente',
    'notifier.title': 'Alerte de prix declenchee !',
    'notifier.body': '{ticker} est passe {condition} votre cible de {price}.',
  },
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fr');

  useEffect(() => {
    const saved = window.localStorage.getItem('investx-language') as Language | null;
    if (saved === 'en' || saved === 'fr') {
      setLanguageState(saved);
      return;
    }

    const browserLanguage = window.navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en';
    setLanguageState(browserLanguage);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem('investx-language', language);
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage: setLanguageState,
    t: (key, values = {}) => {
      const template = translations[language][key] || translations.en[key] || key;
      return Object.entries(values).reduce(
        (text, [name, replacement]) => text.replaceAll(`{${name}}`, String(replacement)),
        template,
      );
    },
  }), [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }

  return context;
}

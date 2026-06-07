import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Activity, ShieldCheck, Zap } from 'lucide-react';
import Link from 'next/link';
import './home.css';

export default function Home() {
  return (
    <main className="main-container">
      <nav className="navbar">
        <div className="logo">
          <span className="logo-icon"></span> InvestX
        </div>
        <div className="nav-actions">
          <Link href="/auth/login">
            <Button variant="ghost">Log In</Button>
          </Link>
          <Link href="/auth/register">
            <Button variant="primary">Start Trading</Button>
          </Link>
        </div>
      </nav>

      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            The Next Generation of <span className="text-gradient">Simulated Trading</span>
          </h1>
          <p className="hero-subtitle">
            Experience real-time market action with a powerful, fast, and beautiful platform. Start with $100,000 and build your empire without risking a dime.
          </p>
          <div className="hero-cta">
            <Link href="/auth/register">
              <Button variant="primary" style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}>
                Open Free Account
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="secondary" style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}>
                Explore Platform
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="hero-visual">
          {/* Abstract visual representation of a dashboard */}
          <Card glass glow className="mockup-card">
            <div className="mockup-header">
              <div className="mockup-dot r"></div>
              <div className="mockup-dot y"></div>
              <div className="mockup-dot g"></div>
            </div>
            <div className="mockup-body">
              <div className="mockup-chart">
                <svg viewBox="0 0 100 40" className="chart-line">
                  <path d="M0,35 L10,32 L20,38 L30,25 L40,28 L50,15 L60,18 L70,5 L80,10 L90,2 L100,8" fill="none" stroke="var(--accent-primary)" strokeWidth="1.5" />
                  <path d="M0,35 L10,32 L20,38 L30,25 L40,28 L50,15 L60,18 L70,5 L80,10 L90,2 L100,8 L100,40 L0,40 Z" fill="url(#gradient)" stroke="none" />
                  <defs>
                    <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.3"/>
                      <stop offset="100%" stopColor="var(--bg-base)" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="mockup-stats">
                <div className="mockup-stat-box"></div>
                <div className="mockup-stat-box"></div>
                <div className="mockup-stat-box"></div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="features-section">
        <div className="feature">
          <div className="feature-icon"><Zap size={24} /></div>
          <h3>Lightning Fast</h3>
          <p>Real-time data streams and atomic transaction processing for instant execution.</p>
        </div>
        <div className="feature">
          <div className="feature-icon"><Activity size={24} /></div>
          <h3>Pro Analytics</h3>
          <p>Deep dive into your portfolio performance with advanced charting and dynamic snapshots.</p>
        </div>
        <div className="feature">
          <div className="feature-icon"><ShieldCheck size={24} /></div>
          <h3>100% Risk Free</h3>
          <p>Practice trading strategies in a simulated environment mirroring real market conditions.</p>
        </div>
      </section>
    </main>
  );
}

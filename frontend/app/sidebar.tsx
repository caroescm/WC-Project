'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './_components/ThemeToggle';

const NAV = [
  { href: '/',             label: 'Dashboard'   },
  { href: '/predictions',  label: 'Predictions' },
  { href: '/results',      label: 'Results'     },
  { href: '/teams',        label: 'Teams'       },
  { href: '/groups',       label: 'Groups'      },
  { href: '/stages',       label: 'Stages'      },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <div style={{
      position: 'fixed',
      top: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 100,
      width: 'calc(100% - 96px)',
      maxWidth: 1200,
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
    }}>

      {/* Left — Logo, floats on page background */}
      <Link href="/" style={{
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 7,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" style={{ stroke: 'var(--accent)' }} strokeWidth="1.8"/>
          <path d="M12 2C12 2 8 7 8 12C8 17 12 22 12 22" style={{ stroke: 'var(--accent)' }} strokeWidth="1.4" strokeLinecap="round"/>
          <path d="M12 2C12 2 16 7 16 12C16 17 12 22 12 22" style={{ stroke: 'var(--accent)' }} strokeWidth="1.4" strokeLinecap="round"/>
          <path d="M2 12H22" style={{ stroke: 'var(--accent)' }} strokeWidth="1.4" strokeLinecap="round"/>
          <path d="M3.5 7H20.5" style={{ stroke: 'var(--accent)' }} strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
          <path d="M3.5 17H20.5" style={{ stroke: 'var(--accent)' }} strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
        </svg>
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>
          <span style={{ color: 'var(--foreground)' }}>Football</span>
          <span style={{ color: 'var(--accent)' }}> Odds</span>
        </span>
      </Link>

      {/* Center — Nav links in their own white pill */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--card-bg)',
        borderRadius: 0,
        border: '1px solid var(--border)',
        
        padding: '4px',
        gap: 2,
      }}>
        {NAV.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={active ? 'nav-link active' : 'nav-link'}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Right — theme toggle */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <ThemeToggle />
      </div>
    </div>
  );
}

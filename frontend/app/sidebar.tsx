'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/',             label: 'Dashboard'   },
  { href: '/predictions',  label: 'Predictions' },
  { href: '/results',      label: 'Results'     },
  { href: '/teams',        label: 'Teams'       },
  { href: '/groups',       label: 'Groups'      },
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
      width: 'calc(100% - 48px)',
      maxWidth: 1200,
    }}>
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        background: '#ffffff',
        borderRadius: 14,
        padding: '0 12px',
        height: 52,
        boxShadow: '0 2px 12px rgba(14, 20, 32, 0.08)',
        border: '1px solid rgba(0,0,0,0.06)',
      }}>
        {/* Logo */}
        <Link href="/" style={{
          textDecoration: 'none',
          padding: '0 16px 0 4px',
          marginRight: 12,
          borderRight: '1px solid #e9e6f4',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          gap: 7,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#1a1628" strokeWidth="1.8"/>
            <path d="M12 2C12 2 8 7 8 12C8 17 12 22 12 22" stroke="#1a1628" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M12 2C12 2 16 7 16 12C16 17 12 22 12 22" stroke="#1a1628" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M2 12H22" stroke="#1a1628" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M3.5 7H20.5" stroke="#1a1628" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
            <path d="M3.5 17H20.5" stroke="#1a1628" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
          </svg>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em' }}>
            <span style={{ color: '#1a1628' }}>Football</span>
            <span style={{ color: '#5b21b6' }}> Odds</span>
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 2 }}>
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
        </div>
      </nav>
    </div>
  );
}

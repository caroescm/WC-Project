'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/',            label: 'Dashboard'   },
  { href: '/upcoming',    label: 'Upcoming'    },
  { href: '/montecarlo',  label: 'Monte Carlo' },
  { href: '/accuracy',    label: 'Accuracy'    },
  { href: '/performance', label: 'xG Perf.'    },
  { href: '/upsets',      label: 'Upsets'      },
  { href: '/archive',     label: 'Archive'     },
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
        gap: 0,
        background: '#1a1628',
        borderRadius: 14,
        padding: '0 8px',
        height: 48,
        boxShadow: '0 4px 24px rgba(0,0,0,0.28), 0 1px 0 rgba(255,255,255,0.06) inset',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        {/* Logo */}
        <Link href="/" style={{
          textDecoration: 'none',
          padding: '0 14px 0 8px',
          marginRight: 8,
          borderRight: '1px solid rgba(255,255,255,0.08)',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em' }}>
            <span style={{ color: '#ffffff' }}>Football</span>
            <span style={{ color: 'rgba(255,255,255,0.35)' }}> Odds</span>
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

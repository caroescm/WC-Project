'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Calendar,
  Shuffle,
  Target,
  BarChart2,
  Zap,
  Archive,
  ChevronLeft,
} from 'lucide-react';

const NAV = [
  { href: '/',            label: 'Dashboard',   Icon: LayoutGrid },
  { href: '/upcoming',    label: 'Upcoming',    Icon: Calendar   },
  { href: '/montecarlo',  label: 'Monte Carlo', Icon: Shuffle    },
  { href: '/accuracy',    label: 'Accuracy',    Icon: Target     },
  { href: '/performance', label: 'xG Perf.',    Icon: BarChart2  },
  { href: '/upsets',      label: 'Upsets',      Icon: Zap        },
  { href: '/archive',     label: 'Archive',     Icon: Archive    },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: collapsed ? 52 : 200,
        minWidth: collapsed ? 52 : 200,
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(12, 18, 35, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRight: '1px solid var(--border)',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        overflow: 'hidden',
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: collapsed ? '20px 0' : '20px 16px',
          display: 'flex',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <Link href="/" style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}>
          {collapsed ? (
            <span className="sport" style={{ fontSize: 18, color: 'var(--accent)' }}>FO</span>
          ) : (
            <>
              <span className="sport" style={{ fontSize: 18, color: 'var(--accent)' }}>Football</span>
              <span className="sport" style={{ fontSize: 18, color: 'var(--foreground)' }}> Odds</span>
            </>
          )}
        </Link>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: collapsed ? '10px 0' : '10px 16px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                color: active ? 'var(--accent)' : 'var(--text-muted)',
                background: active ? 'rgba(201, 168, 76, 0.08)' : 'transparent',
                borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                whiteSpace: 'nowrap',
                transition: 'color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--foreground)';
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
              }}
            >
              <Icon size={16} strokeWidth={1.75} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
          background: 'transparent',
          border: 'none',
          borderTopColor: 'var(--border)',
          borderTopWidth: 1,
          borderTopStyle: 'solid',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          width: '100%',
          flexShrink: 0,
        }}
      >
        <ChevronLeft
          size={16}
          strokeWidth={1.75}
          style={{
            transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        />
        {!collapsed && <span style={{ fontSize: 12 }}>Collapse</span>}
      </button>
    </aside>
  );
}

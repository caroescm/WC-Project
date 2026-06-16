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
    <aside style={{
      width: collapsed ? 52 : 196,
      minWidth: collapsed ? 52 : 196,
      height: '100vh',
      position: 'sticky',
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid rgba(255,255,255,0.07)',
      transition: 'width 0.2s ease, min-width 0.2s ease',
      overflow: 'hidden',
      zIndex: 50,
      flexShrink: 0,
    }}>
      <div style={{
        padding: collapsed ? '18px 0' : '18px 16px',
        display: 'flex',
        justifyContent: collapsed ? 'center' : 'flex-start',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          {collapsed ? (
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.02em' }}>FO</span>
          ) : (
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>
              <span style={{ color: 'var(--accent)' }}>Football</span>
              <span style={{ color: '#ffffff' }}> Odds</span>
            </span>
          )}
        </Link>
      </div>

      <nav style={{ flex: 1, padding: '6px 0', overflowY: 'auto' }}>
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={active ? 'sidebar-link active' : 'sidebar-link'}
              style={{
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '9px 0' : '9px 14px',
              }}
            >
              <Icon size={15} strokeWidth={1.6} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="sidebar-toggle"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '11px 16px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.3)',
          cursor: 'pointer',
          width: '100%',
          flexShrink: 0,
          transition: 'color 0.12s',
        }}
      >
        <ChevronLeft size={15} strokeWidth={1.6} style={{
          transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
        }} />
        {!collapsed && <span style={{ fontSize: 12 }}>Collapse</span>}
      </button>
    </aside>
  );
}

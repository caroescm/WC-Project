"use client";

import Link from "next/link";
import type { ReactNode } from "react";

interface HeroCardProps {
  href: string;
  title: string;
  description: string;
  badge: string;
  icon: ReactNode;
}

export function HeroCard({
  href,
  title,
  description,
  badge,
  icon,
}: HeroCardProps) {
  return (
    <Link href={href} className="block h-full">
      <div className="card" style={{ display:"flex", flexDirection:"column", gap:10, minHeight:148 }}>
        <span className="badge badge-accent" style={{ alignSelf:"flex-start" }}>{badge}</span>
        <div>{icon}</div>
        <h2 className="font-bold text-base tracking-tight mt-auto">{title}</h2>
        <p className="text-sm leading-relaxed" style={{ color:"var(--text-muted)" }}>{description}</p>
      </div>
    </Link>
  );
}

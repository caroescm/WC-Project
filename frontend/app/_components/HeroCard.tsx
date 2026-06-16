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

export function HeroCard({ href, title, description, badge, icon }: HeroCardProps) {
  return (
    <Link href={href} style={{ display: "block", height: "100%", textDecoration: "none" }}>
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 148, height: "100%" }}>
        <span className="badge badge-accent" style={{ alignSelf: "flex-start" }}>{badge}</span>
        <div>{icon}</div>
        <h2 style={{ fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.02em", marginTop: "auto", color: "var(--foreground)" }}>{title}</h2>
        <p style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "var(--text-muted)" }}>{description}</p>
      </div>
    </Link>
  );
}

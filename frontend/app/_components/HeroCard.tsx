"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";

interface HeroCardProps {
  href: string;
  title: string;
  description: string;
  badge: string;
  /** CSS color / rgba for the ambient glow */
  glowColor: string;
  /** accentColor for the badge text & arrow */
  accentColor: string;
  icon: ReactNode;
}

export function HeroCard({
  href,
  title,
  description,
  badge,
  glowColor,
  accentColor,
  icon,
}: HeroCardProps) {
  return (
    <Link href={href} className="block h-full">
      <motion.div
        className="relative rounded-2xl p-6 overflow-hidden cursor-pointer h-full grad-border"
        style={{ minHeight: 148 }}
        initial="rest"
        animate="rest"
        whileHover="hover"
        variants={{
          rest:  { y: 0 },
          hover: { y: -4, transition: { type: "spring", stiffness: 280, damping: 22 } },
        }}
      >
        {/* Ambient glow — appears on hover via variant propagation */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 25% 60%, ${glowColor} 0%, transparent 70%)`,
          }}
          variants={{
            rest:  { opacity: 0 },
            hover: { opacity: 1, transition: { duration: 0.35 } },
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col gap-2.5 h-full">
          <span
            className="self-start text-xs font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(255,255,255,0.04)",
              color: accentColor,
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {badge}
          </span>

          <div className="mt-1">{icon}</div>

          <h2 className="font-bold text-base tracking-tight mt-auto">{title}</h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {description}
          </p>
        </div>

        {/* Arrow — slides right on hover */}
        <motion.span
          className="absolute bottom-5 right-5 text-sm font-bold"
          style={{ color: accentColor }}
          variants={{
            rest:  { x: 0,  opacity: 0.4 },
            hover: { x: 4,  opacity: 1,   transition: { type: "spring", stiffness: 300 } },
          }}
        >
          →
        </motion.span>
      </motion.div>
    </Link>
  );
}

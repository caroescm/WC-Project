"use client";

import { motion } from "framer-motion";

export interface StatCard {
  label: string;
  value: string;
  /** true → gold gradient border + larger number */
  highlight?: boolean;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0,  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

export function StatCards({ cards }: { cards: StatCard[] }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      style={{
        display: "grid",
        /* last card gets 1.35× width to break symmetry */
        gridTemplateColumns: "1fr 1fr 1fr 1.35fr",
        gap: "1rem",
      }}
    >
      {cards.map((card) => (
        <motion.div
          key={card.label}
          variants={item}
          className={card.highlight ? "grad-border-gold" : "grad-border"}
          style={{
            borderRadius: "1rem",
            padding: card.highlight ? "1.4rem 1.25rem" : "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
          }}
        >
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: card.highlight ? "rgba(201,168,76,0.55)" : "var(--text-faint)" }}
          >
            {card.label}
          </span>
          <span
            className="sport"
            style={{
              fontSize: card.highlight ? "2.6rem" : "2.1rem",
              color: "var(--accent)",
            }}
          >
            {card.value}
          </span>
        </motion.div>
      ))}
    </motion.div>
  );
}

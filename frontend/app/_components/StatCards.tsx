"use client";

import { motion } from "framer-motion";

export interface StatCard {
  label: string;
  value: string;
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
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 12,
      }}
    >
      {cards.map((card) => (
        <motion.div
          key={card.label}
          variants={item}
          className="card"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span className="card-title">{card.label}</span>
          <span className="sport" style={{ fontSize: "1.375rem", color: "var(--accent)" }}>
            {card.value}
          </span>
        </motion.div>
      ))}
    </motion.div>
  );
}

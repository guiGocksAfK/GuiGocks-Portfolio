'use client';

import { motion, useReducedMotion } from 'motion/react';

export function Reveal({ children }: { children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();
  return <motion.div initial={false} animate={{ opacity: 1, y: 0 }} whileInView={reducedMotion ? undefined : { y: [8, 0] }} viewport={{ once: true }} transition={{ duration: 0.45, ease: 'easeOut' }}>{children}</motion.div>;
}

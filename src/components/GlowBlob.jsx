import { motion } from 'framer-motion';
import './GlowBlob.css';

export default function GlowBlob({ color = 'green', size = 200, top, left, right, bottom, delay = 0 }) {
  const colorMap = {
    green: 'var(--glow-green)',
    blue: 'var(--glow-blue)',
    accent: 'var(--accent)',
    cyan: 'var(--glow-cyan)',
  };

  const bgColor = colorMap[color] || color;

  return (
    <motion.div
      className="glow-blob"
      style={{
        width: size,
        height: size,
        top,
        left,
        right,
        bottom,
        background: `radial-gradient(circle, ${bgColor}30 0%, transparent 70%)`,
        boxShadow: `0 0 80px 24px ${bgColor}20`,
      }}
      animate={{
        y: [0, -20, 0],
        scale: [1, 1.05, 1],
        opacity: [0.6, 1, 0.6],
      }}
      transition={{
        duration: 6,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

import { motion } from 'framer-motion';
import './GlowBlob.css';

export default function GlowBlob({ color = 'green', size = 240, top, left, right, bottom, delay = 0 }) {
  const colorMap = {
    green: 'rgba(16, 185, 129, 0.07)',
    blue: 'rgba(14, 165, 233, 0.06)',
    accent: 'rgba(52, 211, 153, 0.08)',
    cyan: 'rgba(56, 189, 248, 0.06)',
  };

  const bgColor = colorMap[color] || colorMap.green;

  return (
    <motion.div
      className="glow-blob"
      style={{
        width: size * 1.5,
        height: size * 1.5,
        top,
        left,
        right,
        bottom,
        background: `radial-gradient(circle, ${bgColor} 0%, transparent 70%)`,
      }}
      initial={{ opacity: 0.5 }}
      animate={{
        opacity: [0.35, 0.55, 0.35],
      }}
      transition={{
        duration: 8,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

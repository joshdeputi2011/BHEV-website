import { motion } from 'framer-motion';

export default function GlassCard({
  children,
  className = '',
  hover = true,
  delay = 0,
  style = {},
  onClick,
}) {
  return (
    <motion.div
      className={`glass-card ${hover ? 'glass-card--hover' : ''} ${className}`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      style={style}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

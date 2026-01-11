import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'emerald' | 'violet' | 'amber' | 'blue' | 'none';
}

export const Card: React.FC<CardProps> = ({ children, className = '', glowColor = 'none' }) => {
  const glowStyles = {
    emerald: 'shadow-[0_0_20px_rgba(16,185,129,0.15)] border-emerald-500/20',
    violet: 'shadow-[0_0_20px_rgba(139,92,246,0.15)] border-violet-500/20',
    amber: 'shadow-[0_0_20px_rgba(245,158,11,0.15)] border-amber-500/20',
    blue: 'shadow-[0_0_20px_rgba(59,130,246,0.15)] border-blue-500/20',
    none: 'border-white/5',
  };

  return (
    <div className={`glass-card rounded-2xl p-6 transition-all duration-300 hover:scale-[1.01] ${glowStyles[glowColor]} ${className}`}>
      {children}
    </div>
  );
};

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', glow = false, style, ...props }) => {
  return (
    <div
      className={`card ${glow ? 'card-glow' : ''} ${className}`.trim()}
      style={{
        ...(glow ? { borderColor: 'rgba(0, 242, 254, 0.35)', boxShadow: 'var(--shadow-glow)' } : {}),
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

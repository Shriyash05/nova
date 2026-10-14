import React from 'react';

export type BadgeVariant = 'online' | 'offline' | 'warning' | 'cyan' | 'notion';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  showDot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'cyan',
  children,
  showDot = true,
  className = '',
}) => {
  return (
    <span className={`badge badge-${variant} ${className}`.trim()}>
      {showDot && <span className="badge-dot" />}
      {children}
    </span>
  );
};

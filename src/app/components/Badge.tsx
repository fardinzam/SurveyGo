import * as React from 'react';
import { Badge as ShadcnBadge } from './ui/badge';
import { cn } from './ui/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary' | 'secondary';
  className?: string;
}

const variantStyles: Record<string, string> = {
  success: 'bg-green-100 text-green-700 border-transparent',
  warning: 'bg-yellow-100 text-yellow-700 border-transparent',
  error: 'bg-red-100 text-red-700 border-transparent',
  info: 'bg-blue-100 text-blue-700 border-transparent',
  neutral: 'bg-gray-100 text-gray-700 border-transparent',
  primary: 'bg-primary text-primary-foreground border-transparent',
  secondary: 'bg-secondary text-secondary-foreground border-transparent',
};

export function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  return (
    <ShadcnBadge
      className={cn(
        'rounded-full',
        variantStyles[variant] ?? variantStyles.neutral,
        className,
      )}
    >
      {children}
    </ShadcnBadge>
  );
}

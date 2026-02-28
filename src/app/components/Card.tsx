import * as React from 'react';
import { Card as ShadcnCard } from './ui/card';
import { cn } from './ui/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = '', hover = false, ...props }, ref) => {
    return (
      <ShadcnCard
        ref={ref}
        className={cn(
          'shadow-sm',
          hover && 'hover:shadow-md hover:border-muted-foreground/20',
          className,
        )}
        {...props}
      >
        {children}
      </ShadcnCard>
    );
  }
);

Card.displayName = 'Card';

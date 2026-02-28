import * as React from 'react';
import { Input as ShadcnInput } from './ui/input';
import { Label } from './ui/label';
import { cn } from './ui/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <Label className="block text-sm font-medium text-foreground mb-2">
          {label}
        </Label>
      )}
      <ShadcnInput
        className={cn('h-auto px-4 py-3 rounded-lg', className)}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

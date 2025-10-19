import type { PropsWithChildren } from 'react';
import clsx from 'clsx';

type CardProps = PropsWithChildren<{
  className?: string;
}>;

export function Card({ children, className }: CardProps) {
  return (
    <div className={clsx('rounded-2xl border border-white/5 bg-gray-900/80 shadow-lg backdrop-blur', className)}>
      {children}
    </div>
  );
}

export function CardContent({ children, className }: CardProps) {
  return <div className={clsx('p-6', className)}>{children}</div>;
}

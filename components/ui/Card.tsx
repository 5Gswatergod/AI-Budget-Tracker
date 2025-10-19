import { PropsWithChildren } from 'react';
import { View } from 'react-native';

interface CardProps extends PropsWithChildren {
  padding?: 'sm' | 'md' | 'lg' | 'none';
  className?: string;
}

const paddingMap: Record<NonNullable<CardProps['padding']>, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6'
};

export function Card({ children, padding = 'md', className }: CardProps) {
  return (
    <View className={`bg-surface-elevated rounded-2xl ${paddingMap[padding]} ${className ?? ''}`.trim()}>{children}</View>
  );
}

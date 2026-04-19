import { ReactNode } from 'react';

/**
 * EmptyState — reusable "there's nothing here yet" block.
 *   title       — what this is / short active statement
 *   description — why it's empty + how to fix it
 *   action      — primary CTA, or cluster of suggestion chips
 */

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  suggestions?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, suggestions, className = '' }: EmptyStateProps) {
  return (
    <div className={`text-center py-16 px-4 ${className}`} role="status" aria-live="polite">
      {icon ? (
        <div className="flex justify-center mb-5" aria-hidden="true">{icon}</div>
      ) : null}
      <p className="text-pearl text-lg font-semibold mb-2">{title}</p>
      {description ? (
        <p className="text-silver text-sm mb-6 max-w-md mx-auto leading-relaxed">{description}</p>
      ) : null}
      {action ? <div className="flex justify-center">{action}</div> : null}
      {suggestions ? (
        <div className="flex flex-wrap gap-2 justify-center mt-6 max-w-lg mx-auto">{suggestions}</div>
      ) : null}
    </div>
  );
}

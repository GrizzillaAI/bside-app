import { forwardRef, InputHTMLAttributes, ReactNode, useId } from 'react';

/**
 * Input — the single source of truth for text inputs.
 * Renders its own <label> (so form accessibility is baked in) and pairs with
 * an optional trailing element (e.g. a "show password" eye-toggle).
 *
 * A11y:
 *   - <label> associated via htmlFor/id even if visually hidden
 *   - errors are role="alert" so they're announced when they appear
 */

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  labelHidden?: boolean;
  error?: string;
  trailing?: ReactNode;
  help?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, labelHidden = false, error, help, trailing, className = '', id: idProp, ...rest },
  ref
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const errorId = error ? `${id}-err` : undefined;
  const helpId = help ? `${id}-help` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <label htmlFor={id} className={labelHidden ? 'sr-only' : 'block text-sm font-medium mb-2 text-cloud'}>
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          className={`w-full bg-void border ${error ? 'border-error' : 'border-slate focus:border-pink'} rounded-lg px-4 py-3 ${trailing ? 'pr-12' : ''} text-sm outline-none transition placeholder:text-ash text-pearl focus-visible:ring-2 focus-visible:ring-pink/50 ${className}`}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
        {trailing ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            {trailing}
          </div>
        ) : null}
      </div>
      {help ? (
        <p id={helpId} className="text-xs text-silver mt-1">{help}</p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-error mt-2">
          {error}
        </p>
      ) : null}
    </div>
  );
});

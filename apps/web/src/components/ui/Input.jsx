import { cn } from '../../lib/utils';

export function Input({
  className,
  type = 'text',
  disabled = false,
  error = false,
  ...props
}) {
  return (
    <input
      type={type}
      disabled={disabled}
      className={cn(
        'flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm',
        'placeholder:text-gray-400',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        error && 'border-red-500 focus:ring-red-500',
        className
      )}
      {...props}
    />
  );
}

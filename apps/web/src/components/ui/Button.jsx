import { cn } from '../../lib/utils';

const buttonVariants = {
  variant: {
    default: 'bg-indigo-600 text-white hover:bg-indigo-700',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
    ghost: 'text-gray-700 hover:bg-gray-100',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
  },
  size: {
    default: 'px-4 py-2 text-sm',
    sm: 'px-3 py-1.5 text-xs',
    lg: 'px-6 py-3 text-base',
    icon: 'p-2',
  },
};

export function Button({
  children,
  className,
  variant = 'default',
  size = 'default',
  disabled = false,
  type = 'button',
  onClick,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        baseStyles,
        buttonVariants.variant[variant],
        buttonVariants.size[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

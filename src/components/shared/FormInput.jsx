import { forwardRef } from 'react';

const FormInput = forwardRef(({ label, error, hint, className = '', ...props }, ref) => {
  return (
    <div className={`mb-4 ${className}`}>
      {label && <label className="block text-sm font-medium text-brand-textPrimary mb-1">{label}</label>}
      <input
        ref={ref}
        className={`block w-full rounded-md border ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-brand-border focus:border-brand-blue focus:ring-brand-blue'} shadow-sm sm:text-sm px-3 py-2 outline-none transition-colors`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1 text-sm text-brand-textMuted">{hint}</p>}
    </div>
  );
});

export default FormInput;

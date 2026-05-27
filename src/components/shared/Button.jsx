
const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-brand-blue text-white hover:bg-blue-700 focus:ring-brand-blue",
    outlined: "border border-brand-border text-brand-textPrimary hover:bg-gray-50 focus:ring-gray-200",
    amber: "bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500",
    danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500",
    ghost: "text-brand-textSecondary hover:bg-gray-100 hover:text-brand-textPrimary focus:ring-gray-200"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  const sizeClass = props.size ? sizes[props.size] : sizes.md;

  return (
    <button className={`${baseStyle} ${variants[variant]} ${sizeClass} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;

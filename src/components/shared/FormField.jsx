import { Eye, EyeOff } from 'lucide-react';

const FormField = ({ label, name, type = 'text', placeholder, icon: Icon, value, onChange, showPassword, onTogglePassword }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-semibold text-gray-600">{label}</label>
    <div className="relative">
      <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type={name === 'password' ? (showPassword ? 'text' : 'password') : type}
        name={name}
        required
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-[#001F3F]/40 focus:ring-4 focus:ring-[#001F3F]/5 transition-all"
      />
      {name === 'password' && (
        <button
          type="button"
          onClick={onTogglePassword}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      )}
    </div>
  </div>
);

export default FormField;

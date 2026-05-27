import { useState } from 'react';
import { Eye, Key, X } from 'lucide-react';

const ResetPassword = () => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-brand-navy">Reset User Password</h1>
          <p className="text-brand-textMuted mt-1">Reset password for any user account</p>
        </div>
        <button 
          className="flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-brand-textPrimary hover:bg-gray-50 transition-colors shadow-sm"
        >
          <X size={18} />
          Cancel
        </button>
      </div>

      <div className="max-w-2xl mt-12">
        <div className="bg-white rounded-xl shadow-sm border border-brand-border overflow-hidden">
          <div className="bg-[#fffbeb] px-8 py-5 border-b border-[#fef3c7] flex items-center gap-3">
            <Key size={20} className="text-[#d97706]" />
            <h3 className="font-bold text-[#d97706] text-lg">Reset Password</h3>
          </div>
          <div className="p-10">
            <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); alert('Password reset requested'); }}>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">Username *</label>
                <input 
                  type="text" 
                  placeholder="Enter username"
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">New Password *</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    className="block w-full rounded-lg border border-brand-border px-4 py-3 pr-12 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <Eye size={20} />
                  </button>
                </div>
                <p className="text-xs text-brand-blue font-medium pt-1">
                  Minimum 12 characters with uppercase, lowercase, number, and special character
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="submit"
                  className="flex-1 py-3.5 bg-[#d97706] text-white rounded-lg font-bold text-sm hover:bg-[#b45309] transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Key size={18} fill="currentColor" />
                  Reset Password
                </button>
                <button 
                  type="button"
                  className="flex-1 py-3.5 bg-[#e5e7eb] text-brand-textPrimary rounded-lg font-bold text-sm hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

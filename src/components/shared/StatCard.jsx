const StatCard = ({ title, value, icon: Icon, colorClass, onClick }) => {
  const isClickable = typeof onClick === 'function';
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-brand-border p-6 flex justify-between items-start shadow-sm
        transition-all duration-200
        ${isClickable ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300' : ''}`}
    >
      <div>
        <p className="text-sm font-medium text-brand-textMuted mb-2">{title}</p>
        <h3 className="text-3xl font-bold text-brand-textPrimary">{value}</h3>
      </div>
      {Icon && (
        <div className="p-3 rounded-xl text-white" style={{ backgroundColor: colorClass }}>
          <Icon size={24} />
        </div>
      )}
    </div>
  );
};

export default StatCard;

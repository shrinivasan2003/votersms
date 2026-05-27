
const Modal = ({ isOpen, onClose, title, children, onSave, saveText = 'Save', cancelText = 'Cancel' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-50 backdrop-blur-sm" onClick={onClose} />
        
        <div className="relative inline-block w-full max-w-lg p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-xl sm:my-8 sm:w-full">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-semibold text-brand-textPrimary">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500 focus:outline-none">
              <span className="sr-only">Close</span>
              &times;
            </button>
          </div>
          
          <div className="mb-6">
            {children}
          </div>
          
          <div className="flex justify-end space-x-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-brand-textPrimary bg-white border border-brand-border rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue">
              {cancelText}
            </button>
            {onSave && (
              <button onClick={onSave} className="px-4 py-2 text-sm font-medium text-white bg-brand-blue border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue">
                {saveText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;

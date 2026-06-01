import { useState, useEffect } from 'react';
import DataTable from '../../components/shared/DataTable';
import Button from '../../components/shared/Button';
import Badge from '../../components/shared/Badge';
import { Pencil, Trash2, Eye, EyeOff } from 'lucide-react';

const WhatsappProviders = () => {
  const [view, setView] = useState('list'); // 'list' or 'add'
  const [editingRow, setEditingRow] = useState(null);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [providerType, setProviderType] = useState('Twilio');
  const [showSid, setShowSid] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const API_URL = '/api/whatsapp-providers';

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setProviders(Array.isArray(data) ? data : []);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const columns = [
    { header: 'NAME', accessor: 'name' },
    { header: 'CODE', render: (row) => <Badge>{row.code}</Badge> },
    { header: 'TYPE', render: (row) => <Badge>{row.type}</Badge> },
    { header: 'PRIORITY', accessor: 'priority' },
    { 
      header: 'STATUS', 
      render: (row) => (
        <Badge variant={row.status === 'Active' ? 'success' : 'default'}>
          {row.status}
        </Badge>
      )
    }
  ];

  const handleAdd = () => {
    setEditingRow(null);
    setProviderType('Twilio');
    setView('add');
  };

  const handleEdit = (row) => {
    setEditingRow(row);
    setProviderType(row.type || 'Twilio');
    setView('add');
  };

  const handleBack = () => {
    setView('list');
    setEditingRow(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      code: formData.get('code'),
      type: providerType,
      priority: formData.get('priority'),
      account_sid: formData.get('account_sid'),
      auth_token: formData.get('auth_token'),
      from_number: formData.get('from_number'),
      status: formData.get('active') === 'on' ? 'Active' : 'Inactive'
    };

    try {
      const method = editingRow ? 'PUT' : 'POST';
      const url = editingRow ? `${API_URL}/${editingRow.id}` : API_URL;
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        alert(`WhatsApp Provider ${editingRow ? 'updated' : 'created'} successfully!`);
        fetchProviders();
        handleBack();
      }
    } catch (err) {
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Are you sure you want to delete ${row.name}?`)) return;
    
    try {
      const res = await fetch(`${API_URL}/${row.id}`, { method: 'DELETE' });
      if (res.ok) fetchProviders();
    } catch (err) {
    }
  };

  if (view === 'add') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-brand-navy">
              {editingRow ? 'Edit WhatsApp Provider' : 'Add WhatsApp Provider'}
            </h1>
            <p className="text-brand-textMuted mt-1">
              {editingRow ? 'Update existing service configuration' : 'Create a new WhatsApp provider'}
            </p>
          </div>
          <button 
            onClick={handleBack} 
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-brand-textPrimary hover:bg-gray-50 transition-colors"
          >
            Back to List
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-brand-border p-8 max-w-7xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">Name *</label>
                <input 
                  type="text"
                  name="name"
                  defaultValue={editingRow?.name || ''} 
                  placeholder="e.g., Twilio"
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">Code *</label>
                <input 
                  type="text"
                  name="code"
                  defaultValue={editingRow?.code || ''} 
                  placeholder="e.g., twilio"
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                  required 
                />
                <p className="text-[11px] text-brand-textMuted">Unique identifier (lowercase, no spaces)</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">Type *</label>
                <select 
                  value={providerType}
                  onChange={(e) => setProviderType(e.target.value)}
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue bg-white transition-all"
                  required
                >
                  <option value="Twilio">Twilio</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">Priority</label>
                <input 
                  type="number"
                  name="priority"
                  defaultValue={editingRow?.priority || '0'} 
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                />
                <p className="text-[11px] text-brand-textMuted">Higher priority providers are used first (default: 0)</p>
              </div>
            </div>

            <div className="pt-4 space-y-6">
              <h3 className="text-lg font-bold text-brand-textPrimary">{providerType} Configuration</h3>
              
              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">Account SID</label>
                <div className="relative">
                  <input 
                    type={showSid ? "text" : "password"}
                    name="account_sid"
                    defaultValue={editingRow?.account_sid || ''} 
                    placeholder="admin"
                    className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all bg-gray-50/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSid(!showSid)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-blue"
                  >
                    {showSid ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">Auth Token</label>
                <div className="relative">
                  <input 
                    type={showToken ? "text" : "password"}
                    name="auth_token"
                    defaultValue={editingRow?.auth_token || ''} 
                    className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all bg-gray-50/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-blue"
                  >
                    {showToken ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">From Number</label>
                <input 
                  type="text"
                  name="from_number"
                  defaultValue={editingRow?.from_number || ''} 
                  placeholder="+1234567890"
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                />
                <p className="text-[11px] text-brand-textMuted">Your Twilio WhatsApp enabled phone number (E.164 format, e.g., whatsapp:+14155238886)</p>
              </div>

              <div className="flex items-center space-x-3">
                <input 
                  type="checkbox" 
                  name="active"
                  id="active" 
                  className="w-5 h-5 rounded border-brand-border text-brand-blue focus:ring-brand-blue cursor-pointer"
                  defaultChecked={editingRow?.status === 'Active' || !editingRow}
                />
                <label htmlFor="active" className="text-sm font-semibold text-brand-textPrimary cursor-pointer">Active</label>
              </div>
            </div>
            
            <div className="flex gap-4 pt-4">
              <button 
                type="submit" 
                className="flex-1 py-3.5 bg-brand-navy text-white rounded-lg font-bold text-sm hover:bg-opacity-90 transition-all"
                style={{ backgroundColor: '#0047AB' }}
              >
                Save
              </button>
              <button 
                type="button" 
                onClick={handleBack} 
                className="flex-1 py-3.5 bg-gray-200 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-brand-navy">WhatsApp Providers</h1>
          <p className="text-brand-textMuted mt-1">Manage WhatsApp service providers</p>
        </div>
        <Button onClick={handleAdd} className="rounded-lg px-6 py-2.5 font-semibold">+ Add Provider</Button>
      </div>

      <DataTable 
        columns={columns} 
        data={providers} 
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage={loading ? 'Loading providers...' : 'No providers found. Add your first WhatsApp provider!'}
      />
    </div>
  );
};

export default WhatsappProviders;

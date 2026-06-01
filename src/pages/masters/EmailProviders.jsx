import { useState, useEffect } from 'react';
import DataTable from '../../components/shared/DataTable';
import Button from '../../components/shared/Button';
import Badge from '../../components/shared/Badge';
import { emailProvidersApi } from '../../api/email';

const EmailProviders = () => {
  const [view, setView] = useState('list'); // 'list' or 'add'
  const [editingRow, setEditingRow] = useState(null);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [providerType, setProviderType] = useState('SMTP');

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const data = await emailProvidersApi.list();
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
    { header: 'CODE', accessor: 'code' },
    { header: 'NAME', accessor: 'name' },
    { 
      header: 'TYPE', 
      render: (row) => (
        <Badge variant="info" className="bg-blue-100 text-blue-700">
          {row.type}
        </Badge>
      )
    },
    { 
      header: 'CONFIGURATION', 
      render: (row) => (
        <span className="text-brand-textMuted text-sm">
          {row.config_email || row.smtp_host || 'N/A'}
        </span>
      )
    },
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
    setProviderType('SMTP');
    setView('add');
  };

  const handleEdit = (row) => {
    setEditingRow(row);
    setProviderType(row.type || 'SMTP');
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
      smtp_pass: formData.get('smtp_pass'), // Postmark API Key
      config_email: formData.get('config_email'), // From Email
      smtp_user: formData.get('smtp_user'), // From Name
      status: formData.get('active') === 'on' ? 'Active' : 'Inactive'
    };

    try {
      if (editingRow) {
        await emailProvidersApi.update(editingRow.id, data);
      } else {
        await emailProvidersApi.create(data);
      }
      alert(`Email Provider ${editingRow ? 'updated' : 'created'} successfully!`);
      fetchProviders();
      handleBack();
    } catch (err) {
      alert(`Error: ${err.message || 'Failed to save provider.'}`);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Are you sure you want to delete ${row.name}?`)) return;
    
    try {
      await emailProvidersApi.remove(row.id);
      fetchProviders();
    } catch (err) {
    }
  };

  if (view === 'add') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-brand-navy">{editingRow ? 'Edit Email Provider' : 'Add Email Provider'}</h1>
            <p className="text-brand-textMuted mt-1">{editingRow ? 'Update email provider details' : 'Create a new email provider'}</p>
          </div>
          <button 
            onClick={handleBack} 
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-brand-textPrimary hover:bg-gray-50 transition-colors"
          >
            Back to List
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-brand-border p-8 max-w-7xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">Code *</label>
              <input 
                type="text"
                name="code"
                defaultValue={editingRow?.code || ''} 
                placeholder="e.g., SMTP_GMAIL or POSTMARK_PROD"
                className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                required 
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">Name *</label>
              <input 
                type="text"
                name="name"
                defaultValue={editingRow?.name || ''} 
                placeholder="e.g., Gmail SMTP or Postmark Production"
                className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                required 
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-bold text-brand-textPrimary">Provider Type *</label>
              <div className="flex items-center space-x-6">
                <label className="flex items-center space-x-2 cursor-pointer group">
                  <input 
                    type="radio" 
                    name="type" 
                    value="SMTP"
                    checked={providerType === 'SMTP'}
                    onChange={() => setProviderType('SMTP')}
                    className="w-4 h-4 border-gray-300 text-brand-blue focus:ring-brand-blue cursor-pointer"
                  />
                  <span className="text-sm font-medium text-brand-textPrimary group-hover:text-brand-blue transition-colors">SMTP</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer group">
                  <input 
                    type="radio" 
                    name="type" 
                    value="Postmark"
                    checked={providerType === 'Postmark'}
                    onChange={() => setProviderType('Postmark')}
                    className="w-4 h-4 border-gray-300 text-brand-blue focus:ring-brand-blue cursor-pointer"
                  />
                  <span className="text-sm font-medium text-brand-textPrimary group-hover:text-brand-blue transition-colors">Postmark</span>
                </label>
              </div>
            </div>

            <div className="space-y-6 pt-2">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">Postmark API Key *</label>
                <input 
                  type="password"
                  name="smtp_pass"
                  defaultValue={editingRow?.smtp_pass || ''} 
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                  required 
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">From Email *</label>
                <input 
                  type="email"
                  name="config_email"
                  defaultValue={editingRow?.config_email || ''} 
                  placeholder="support@ballotda.com"
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                  required 
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">From Name *</label>
                <input 
                  type="text"
                  name="smtp_user"
                  defaultValue={editingRow?.smtp_user || ''} 
                  placeholder="BallotDA Support"
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                  required 
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <input 
                type="checkbox" 
                name="active"
                id="active" 
                className="w-5 h-5 rounded border-brand-border text-brand-blue focus:ring-brand-blue cursor-pointer"
                defaultChecked={editingRow?.status === 'Active' || !editingRow}
              />
              <label htmlFor="active" className="text-sm font-semibold text-brand-textPrimary cursor-pointer">Active</label>
            </div>
            
            <div className="flex gap-4 pt-4">
              <button 
                type="submit" 
                className="flex-1 py-3.5 bg-brand-navy text-white rounded-lg font-bold text-sm hover:bg-opacity-90 transition-all"
                style={{ backgroundColor: '#0047AB' }}
              >
                Update
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
          <h1 className="text-3xl font-bold text-brand-navy">Email Providers</h1>
          <p className="text-brand-textMuted mt-1">Manage email service providers</p>
        </div>
        <Button onClick={handleAdd} className="rounded-lg px-6 py-2.5 font-semibold">+ Add Provider</Button>
      </div>

      <DataTable 
        columns={columns} 
        data={providers} 
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage={loading ? 'Loading providers...' : 'No providers found'}
      />
    </div>
  );
};

export default EmailProviders;

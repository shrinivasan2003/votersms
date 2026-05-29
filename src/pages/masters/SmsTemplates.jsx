import { useState, useEffect, useRef } from 'react';
import DataTable from '../../components/shared/DataTable';
import Button from '../../components/shared/Button';
import FormInput from '../../components/shared/FormInput';
import Badge from '../../components/shared/Badge';
import ListTagPicker from '../../components/shared/ListTagPicker';

const SmsTemplates = () => {
  const [view, setView] = useState('list'); // 'list' or 'add'
  const [editingRow, setEditingRow] = useState(null);
  const [templates, setTemplates] = useState([]);
  const bodyRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const API_URL = '/api/sms-templates';

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const columns = [
    { header: 'CODE', accessor: 'code' },
    { header: 'NAME', accessor: 'name' },
    { 
      header: 'BODY PREVIEW', 
      render: (row) => (
        <span className="text-brand-textMuted text-sm truncate block max-w-lg">
          {row.body?.length > 80 ? `${row.body.substring(0, 80)}...` : row.body}
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
    setView('add');
  };

  const handleEdit = (row) => {
    setEditingRow(row);
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
      code: formData.get('code'),
      name: formData.get('name'),
      body: formData.get('body'),
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
        fetchTemplates();
        handleBack();
      }
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Are you sure you want to delete ${row.name}?`)) return;
    
    try {
      const res = await fetch(`${API_URL}/${row.id}`, { method: 'DELETE' });
      if (res.ok) fetchTemplates();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  if (view === 'add') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">Add SMS Template</h1>
            <p className="text-sm text-brand-textMuted mt-1">Create a new SMS template</p>
          </div>
          <button
            onClick={handleBack}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-brand-textPrimary hover:bg-gray-50 transition-colors"
          >
            Back to List
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-brand-border p-4 sm:p-8 max-w-full">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">Code *</label>
                <input 
                  type="text"
                  name="code"
                  defaultValue={editingRow?.code || ''} 
                  placeholder="e.g., WELCOME_MSG"
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
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">Message Body *</label>
                <textarea
                  ref={bodyRef}
                  name="body"
                  className="block w-full rounded-lg border border-brand-border px-4 py-4 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue min-h-[160px] transition-all"
                  required
                  placeholder="e.g. Dear {{FirstName}}, your ballot is ready..."
                  defaultValue={editingRow?.body || ''}
                ></textarea>
                <div className="text-xs text-brand-textMuted pt-1 space-y-0.5">
                  <p className="font-semibold text-brand-textSecondary">Available variables:</p>
                  <p>
                    <code className="bg-gray-100 px-1 rounded">{'{{FirstName}}'}</code> — recipient's first name &nbsp;
                    <code className="bg-gray-100 px-1 rounded">{'{{LastName}}'}</code> — last name &nbsp;
                    <code className="bg-gray-100 px-1 rounded">{'{{FullName}}'}</code> — full name
                  </p>
                  <p className="text-gray-400">Example: <em>Dear {'{{FirstName}}'}, your appointment is confirmed.</em></p>
                </div>
                <ListTagPicker textareaRef={bodyRef} />
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
                Create
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">SMS Templates</h1>
          <p className="text-sm text-brand-textMuted mt-1">Manage SMS message templates</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={handleAdd} className="rounded-lg px-6 py-2.5 font-semibold">+ Add Template</Button>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={templates} 
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage={loading ? 'Loading templates...' : 'No templates found'}
      />
    </div>
  );
};

export default SmsTemplates;

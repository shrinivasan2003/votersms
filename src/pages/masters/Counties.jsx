import { useState, useEffect } from 'react';
import DataTable from '../../components/shared/DataTable';
import Button from '../../components/shared/Button';
import FormInput from '../../components/shared/FormInput';

const Counties = () => {
  const [view, setView] = useState('list'); // 'list' or 'add'
  const [editingRow, setEditingRow] = useState(null);
  const [counties, setCounties] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_URL = '/api/counties';

  const fetchCounties = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setCounties(data);
    } catch (err) {
      // alert('Failed to load counties. Is the backend server running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounties();
  }, []);

  const columns = [
    { header: 'CODE', accessor: 'code' },
    { header: 'NAME', accessor: 'name' },
    { header: 'STATE', accessor: 'state' }
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
      state: formData.get('state'),
      status: 'Active'
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
        alert(editingRow ? 'County updated successfully!' : 'County created successfully!');
        fetchCounties();
        handleBack();
      } else {
        const errorData = await res.json();
        alert(`Failed to save: ${JSON.stringify(errorData)}`);
      }
    } catch (err) {
      alert('Network error: Could not connect to the server.');
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Are you sure you want to delete ${row.name}?`)) return;
    
    try {
      const res = await fetch(`${API_URL}/${row.id}`, { method: 'DELETE' });
      if (res.ok) fetchCounties();
    } catch (err) {
    }
  };

  if (view === 'add') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-brand-navy">{editingRow ? 'Edit County' : 'Add County'}</h1>
            <p className="text-brand-textMuted mt-1">{editingRow ? 'Update county details' : 'Create a new county'}</p>
          </div>
          <Button variant="outlined" onClick={handleBack} className="rounded-lg px-6">
            Back to List
          </Button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-brand-border p-8 max-w-6xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            <FormInput 
              label="Code *" 
              name="code"
              defaultValue={editingRow?.code || ''} 
              placeholder="Enter county code"
              required 
            />
            <FormInput 
              label="Name *" 
              name="name"
              defaultValue={editingRow?.name || ''} 
              placeholder="Enter county name"
              required 
            />
            <FormInput 
              label="State" 
              name="state"
              defaultValue={editingRow?.state || 'GA'} 
              placeholder="Enter state"
            />
            
            <div className="flex gap-4 pt-4">
              <Button type="submit" className="flex-1 py-3">
                {editingRow ? 'Update' : 'Create'}
              </Button>
              <Button type="button" onClick={handleBack} variant="outlined" className="flex-1 py-3 bg-gray-100 border-none">
                Cancel
              </Button>
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
          <h1 className="text-2xl font-bold text-brand-navy">Counties</h1>
          <p className="text-brand-textMuted">Manage counties and their details</p>
        </div>
        <Button onClick={handleAdd}>+ Add County</Button>
      </div>

      <DataTable 
        columns={columns} 
        data={counties} 
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage={loading ? 'Loading counties...' : 'No counties found'}
      />
    </div>
  );
};

export default Counties;

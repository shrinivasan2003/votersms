import { useState, useEffect } from 'react';
import { countiesApi } from '../../api/voters';
import DataTable from '../../components/shared/DataTable';
import Button from '../../components/shared/Button';
import FormInput from '../../components/shared/FormInput';

const Counties = () => {
  const [view, setView] = useState('list'); // 'list' or 'add'
  const [editingRow, setEditingRow] = useState(null);
  const [counties, setCounties] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCounties = async () => {
    setLoading(true);
    try {
      const data = await countiesApi.list();
      setCounties(Array.isArray(data) ? data : []);
    } catch (err) {
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
      if (editingRow) {
        await countiesApi.update(editingRow.id, data);
      } else {
        await countiesApi.create(data);
      }
      alert(editingRow ? 'County updated successfully!' : 'County created successfully!');
      fetchCounties();
      handleBack();
    } catch (err) {
      alert(`Failed to save: ${err.message}`);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Are you sure you want to delete ${row.name}?`)) return;
    
    try {
      await countiesApi.remove(row.id);
      fetchCounties();
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

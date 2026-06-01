import { useState, useEffect } from 'react';
import DataTable from '../../components/shared/DataTable';
import Button from '../../components/shared/Button';
import FormInput from '../../components/shared/FormInput';

const Precincts = () => {
  const [view, setView] = useState('list'); // 'list' or 'add'
  const [editingRow, setEditingRow] = useState(null);
  const [precincts, setPrecincts] = useState([]);
  const [counties, setCounties] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_URL = '/api/precincts';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [precinctsRes, countiesRes] = await Promise.all([
        fetch('/api/precincts-detailed'),
        fetch('/api/counties')
      ]);
      const precinctsData = await precinctsRes.json();
      const countiesData = await countiesRes.json();
      setPrecincts(Array.isArray(precinctsData) ? precinctsData : []);
      setCounties(Array.isArray(countiesData) ? countiesData : []);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns = [
    { header: 'CODE', accessor: 'code' },
    { header: 'NAME', accessor: 'name' },
    { header: 'COUNTY', accessor: 'county_name' },
    { header: 'ZIPCODE', accessor: 'zipcode' }
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
      county_id: formData.get('county_id'),
      zipcode: formData.get('zipcode')
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
        fetchData();
        handleBack();
      }
    } catch (err) {
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Are you sure you want to delete precinct ${row.name}?`)) return;
    try {
      const res = await fetch(`${API_URL}/${row.id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (err) {
    }
  };

  if (view === 'add') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-brand-navy">{editingRow ? 'Edit Precinct' : 'Add Precinct'}</h1>
            <p className="text-brand-textMuted mt-1">{editingRow ? 'Update precinct details' : 'Create a new precinct'}</p>
          </div>
          <Button variant="outlined" onClick={handleBack} className="rounded-lg px-6">
            Back to List
          </Button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-brand-border p-8 max-w-6xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-brand-textPrimary">County *</label>
              <select 
                name="county_id"
                className="block w-full rounded-md border border-brand-border px-3 py-3 outline-none focus:border-brand-blue focus:ring-brand-blue bg-white" 
                required 
                defaultValue={editingRow?.county_id || ''}
              >
                <option value="">Select County</option>
                {counties.map(county => (
                  <option key={county.id} value={county.id}>{county.name}</option>
                ))}
              </select>
            </div>

            <FormInput 
              label="Code *" 
              name="code"
              defaultValue={editingRow?.code || ''} 
              placeholder="Enter precinct code"
              required 
            />
            
            <FormInput 
              label="Name *" 
              name="name"
              defaultValue={editingRow?.name || ''} 
              placeholder="Enter precinct name"
              required 
            />
            
            <FormInput 
              label="Zipcode" 
              name="zipcode"
              defaultValue={editingRow?.zipcode || ''} 
              placeholder="Enter zipcode"
            />
            
            <div className="flex gap-4 pt-4">
              <Button type="submit" className="flex-1 py-3 bg-brand-blue text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                {editingRow ? 'Update' : 'Create'}
              </Button>
              <Button type="button" onClick={handleBack} variant="outlined" className="flex-1 py-3 bg-gray-100 border-none text-brand-textPrimary rounded-lg font-semibold hover:bg-gray-200 transition-colors">
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
          <h1 className="text-2xl font-bold text-brand-navy">Precincts</h1>
          <p className="text-brand-textMuted">Manage precincts and their details</p>
        </div>
        <Button onClick={handleAdd}>+ Add Precinct</Button>
      </div>

      <DataTable 
        columns={columns} 
        data={precincts} 
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage={loading ? 'Loading precincts...' : 'No precincts found'}
      />
    </div>
  );
};

export default Precincts;

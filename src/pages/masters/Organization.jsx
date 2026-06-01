import { useState, useEffect } from 'react';
import DataTable from '../../components/shared/DataTable';
import Button from '../../components/shared/Button';
import FormInput from '../../components/shared/FormInput';
import { MapPin, Building2 } from 'lucide-react';

// ── County sub-section ────────────────────────────────────────────────────────
const CountiesSection = () => {
  const [view, setView]           = useState('list');
  const [editingRow, setEditingRow] = useState(null);
  const [counties, setCounties]   = useState([]);
  const [loading, setLoading]     = useState(false);

  const API = '/api/counties';

  const fetchCounties = async () => {
    setLoading(true);
    try {
      const res  = await fetch(API);
      const data = await res.json();
      setCounties(Array.isArray(data) ? data : []);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCounties(); }, []);

  const columns = [
    { header: 'CODE',  accessor: 'code'  },
    { header: 'NAME',  accessor: 'name'  },
    { header: 'STATE', accessor: 'state' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd   = new FormData(e.target);
    const data = { code: fd.get('code'), name: fd.get('name'), state: fd.get('state'), status: 'Active' };
    try {
      const method = editingRow ? 'PUT' : 'POST';
      const url    = editingRow ? `${API}/${editingRow.id}` : API;
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (res.ok) { fetchCounties(); setView('list'); setEditingRow(null); }
      else { const err = await res.json(); alert(`Failed to save: ${JSON.stringify(err)}`); }
    } catch (err) {
      alert('Network error: Could not connect to the server.');
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete county "${row.name}"?`)) return;
    try {
      const res = await fetch(`${API}/${row.id}`, { method: 'DELETE' });
      if (res.ok) fetchCounties();
    } catch (_err) { }
  };

  if (view === 'add') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-brand-navy">{editingRow ? 'Edit County' : 'Add County'}</h2>
            <p className="text-sm text-brand-textMuted mt-1">{editingRow ? 'Update county details' : 'Create a new county'}</p>
          </div>
          <Button variant="outlined" onClick={() => { setView('list'); setEditingRow(null); }} className="rounded-lg px-6">
            Back to List
          </Button>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-brand-border p-4 sm:p-8 max-w-full sm:max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormInput label="Code *"  name="code"  defaultValue={editingRow?.code  || ''} placeholder="Enter county code"  required />
            <FormInput label="Name *"  name="name"  defaultValue={editingRow?.name  || ''} placeholder="Enter county name"  required />
            <FormInput label="State"   name="state" defaultValue={editingRow?.state || 'GA'} placeholder="State abbreviation" />
            <div className="flex gap-4 pt-2">
              <Button type="submit" className="flex-1 py-3">{editingRow ? 'Update County' : 'Create County'}</Button>
              <Button type="button" onClick={() => { setView('list'); setEditingRow(null); }} variant="outlined" className="flex-1 py-3 bg-gray-100 border-none">Cancel</Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-brand-textMuted text-sm">Manage counties and their details</p>
        <Button onClick={() => { setEditingRow(null); setView('add'); }}>+ Add County</Button>
      </div>
      <DataTable
        columns={columns}
        data={counties}
        onEdit={(row) => { setEditingRow(row); setView('add'); }}
        onDelete={handleDelete}
        emptyMessage={loading ? 'Loading counties...' : 'No counties found'}
      />
    </div>
  );
};

// ── Precincts sub-section ─────────────────────────────────────────────────────
const PrecinctsSection = () => {
  const [view, setView]           = useState('list');
  const [editingRow, setEditingRow] = useState(null);
  const [precincts, setPrecincts] = useState([]);
  const [counties, setCounties]   = useState([]);
  const [loading, setLoading]     = useState(false);

  const API = '/api/precincts';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pr, cr] = await Promise.all([
        fetch('/api/precincts-detailed'),
        fetch('/api/counties'),
      ]);
      const pd = await pr.json();
      const cd = await cr.json();
      setPrecincts(Array.isArray(pd) ? pd : []);
      setCounties(Array.isArray(cd) ? cd : []);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const columns = [
    { header: 'CODE',    accessor: 'code'        },
    { header: 'NAME',    accessor: 'name'        },
    { header: 'COUNTY',  accessor: 'county_name' },
    { header: 'ZIPCODE', accessor: 'zipcode'     },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd   = new FormData(e.target);
    const data = { code: fd.get('code'), name: fd.get('name'), county_id: fd.get('county_id'), zipcode: fd.get('zipcode') };
    try {
      const method = editingRow ? 'PUT' : 'POST';
      const url    = editingRow ? `${API}/${editingRow.id}` : API;
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (res.ok) { fetchData(); setView('list'); setEditingRow(null); }
    } catch (err) {
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete precinct "${row.name}"?`)) return;
    try {
      const res = await fetch(`${API}/${row.id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (_err) { }
  };

  if (view === 'add') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-brand-navy">{editingRow ? 'Edit Precinct' : 'Add Precinct'}</h2>
            <p className="text-sm text-brand-textMuted mt-1">{editingRow ? 'Update precinct details' : 'Create a new precinct'}</p>
          </div>
          <Button variant="outlined" onClick={() => { setView('list'); setEditingRow(null); }} className="rounded-lg px-6">
            Back to List
          </Button>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-brand-border p-4 sm:p-8 max-w-full sm:max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-brand-textPrimary">County *</label>
              <select
                name="county_id"
                className="block w-full rounded-md border border-brand-border px-3 py-3 outline-none focus:border-brand-blue focus:ring-brand-blue bg-white"
                required
                defaultValue={editingRow?.county_id || ''}
              >
                <option value="">Select County</option>
                {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <FormInput label="Code *"   name="code"    defaultValue={editingRow?.code    || ''} placeholder="Enter precinct code" required />
            <FormInput label="Name *"   name="name"    defaultValue={editingRow?.name    || ''} placeholder="Enter precinct name" required />
            <FormInput label="Zipcode"  name="zipcode" defaultValue={editingRow?.zipcode || ''} placeholder="Enter zipcode"        />
            <div className="flex gap-4 pt-2">
              <Button type="submit" className="flex-1 py-3">{editingRow ? 'Update Precinct' : 'Create Precinct'}</Button>
              <Button type="button" onClick={() => { setView('list'); setEditingRow(null); }} variant="outlined" className="flex-1 py-3 bg-gray-100 border-none">Cancel</Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-brand-textMuted text-sm">Manage precincts and their details</p>
        <Button onClick={() => { setEditingRow(null); setView('add'); }}>+ Add Precinct</Button>
      </div>
      <DataTable
        columns={columns}
        data={precincts}
        onEdit={(row) => { setEditingRow(row); setView('add'); }}
        onDelete={handleDelete}
        emptyMessage={loading ? 'Loading precincts...' : 'No precincts found'}
      />
    </div>
  );
};

// ── Organization page ─────────────────────────────────────────────────────────
const Organization = () => {
  const [tab, setTab] = useState('counties');

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Organization</h1>
        <p className="text-brand-textMuted">Manage counties and precincts</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab('counties')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-colors ${
            tab === 'counties'
              ? 'border-[#0047AB] text-[#0047AB]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <MapPin size={15} /> Counties
        </button>
        <button
          onClick={() => setTab('precincts')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-colors ${
            tab === 'precincts'
              ? 'border-[#0047AB] text-[#0047AB]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Building2 size={15} /> Precincts
        </button>
      </div>

      {/* Tab content */}
      {tab === 'counties'  && <CountiesSection />}
      {tab === 'precincts' && <PrecinctsSection />}
    </div>
  );
};

export default Organization;

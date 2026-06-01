import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import DataTable from '../../components/shared/DataTable';
import Button from '../../components/shared/Button';
import FormInput from '../../components/shared/FormInput';
import Badge from '../../components/shared/Badge';
import Modal from '../../components/shared/Modal';
import Lists from './Lists';
import { Download, Upload, Users, ListChecks, FileSpreadsheet } from 'lucide-react';

// ── Proper CSV parser (handles quoted fields with commas) ─────────────────────
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const parse = (line) => {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        result.push(cur.trim()); cur = '';
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parse(lines[0]).map(h => h.toLowerCase());
  return lines
    .slice(1)
    .filter(l => l.trim())
    .map(line => {
      const vals = parse(line);
      const row = {};
      headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
      return row;
    });
}

// ── Excel / CSV → JSON ────────────────────────────────────────────────────────
function parseSpreadsheet(file) {
  return new Promise((resolve, reject) => {
    const isCSV = /\.csv$/i.test(file.name);
    if (isCSV) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try { resolve(parseCSV(e.target.result)); }
        catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    } else {
      // Excel
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb   = XLSX.read(e.target.result, { type: 'array' });
          const ws   = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
          const normalized = rows.map(row => {
            const n = {};
            Object.keys(row).forEach(k => { n[k.toLowerCase().trim()] = String(row[k] ?? '').trim(); });
            return n;
          });
          resolve(normalized);
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    }
  });
}

// ── Tab bar shared between both sections ──────────────────────────────────────
const TabBar = ({ tab, setTab, onSwitchToRecipients }) => (
  <div className="flex gap-1 border-b border-gray-200 mb-1">
    <button
      onClick={() => { setTab('recipients'); if (onSwitchToRecipients) onSwitchToRecipients(); }}
      className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-colors ${
        tab === 'recipients'
          ? 'border-[#0047AB] text-[#0047AB]'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      <Users size={15} /> Recipients
    </button>
    <button
      onClick={() => setTab('lists')}
      className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-colors ${
        tab === 'lists'
          ? 'border-[#0047AB] text-[#0047AB]'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      <ListChecks size={15} /> Lists
    </button>
  </div>
);

const Voters = () => {
  const [tab, setTab] = useState('recipients');   // 'recipients' | 'lists'
  const [view, setView] = useState('list');        // 'list' | 'add'
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [precincts, setPrecincts] = useState([]);
  const fileInputRef = useRef(null);

  const API_URL = '/api/voters';

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setVoters(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch recipients:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrecincts = async () => {
    try {
      const res = await fetch('/api/precincts');
      const data = await res.json();
      setPrecincts(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (tab === 'recipients') fetchData();
  }, [tab]);

  const columns = [
    { header: 'NAME', render: (row) => `${row.first_name} ${row.last_name}` },
    { header: 'EMAIL', accessor: 'email' },
    { header: 'PHONE', accessor: 'phone' },
    { header: 'STATUS', render: (row) => <Badge variant={row.status === 'Active' ? 'success' : 'default'}>{row.status}</Badge> }
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
      first_name: formData.get('first_name'),
      last_name:  formData.get('last_name'),
      email:      formData.get('email'),
      phone:      formData.get('phone'),
      status:     formData.get('active') === 'on' ? 'Active' : 'Inactive'
    };

    try {
      const method = editingRow ? 'PUT' : 'POST';
      const url    = editingRow ? `${API_URL}/${editingRow.id}` : API_URL;
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) { fetchData(); handleBack(); }
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Are you sure you want to delete recipient ${row.first_name} ${row.last_name}?`)) return;
    try {
      const res = await fetch(`${API_URL}/${row.id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const validExt = /\.(csv|xlsx|xls)$/i.test(file.name);
    if (!validExt) {
      alert('Please select a CSV or Excel file (.csv, .xlsx, .xls)');
      e.target.value = '';
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      const rows = await parseSpreadsheet(selectedFile);
      if (!rows.length) {
        alert('The file appears to be empty.');
        setIsUploading(false);
        return;
      }
      const res    = await fetch(`${API_URL}/bulk`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(rows),
      });
      const result = await res.json();
      if (res.ok) {
        const msg = [
          `✅ Successfully uploaded ${result.inserted} recipient(s).`,
          result.skipped  > 0 ? `⚠️ ${result.skipped} empty row(s) skipped.`  : '',
          result.failed   > 0 ? `❌ ${result.failed} row(s) failed to insert.` : '',
        ].filter(Boolean).join('\n');
        alert(msg);
        setIsUploadModalOpen(false);
        setSelectedFile(null);
        fetchData();
      } else {
        // FastAPI returns { detail: "..." } or { detail: { message: "..." } }
        const detail = result.detail;
        const msg = (typeof detail === 'object' ? detail?.message : detail) || 'Upload failed. Please check the file format.';
        alert(msg);
      }
    } catch (err) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    // Build sample precinct value from loaded precincts if available
    const precinctSample = precincts.length > 0 ? precincts[0].name : 'Precinct A';
    const wb = XLSX.utils.book_new();
    const data = [
      ['first_name', 'last_name', 'email', 'phone', 'precinct'],
      ['John',  'Doe',   'john@example.com',  '1234567890', precinctSample],
      ['Jane',  'Smith', 'jane@example.com',  '0987654321', precinctSample],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Recipients');
    XLSX.writeFile(wb, 'recipient_template.xlsx');
  };

  // ── Lists tab ─────────────────────────────────────────────────────────────
  if (tab === 'lists') {
    return (
      <div className="space-y-4">
        <TabBar tab={tab} setTab={setTab} />
        <Lists />
      </div>
    );
  }

  // ── Add / Edit form ───────────────────────────────────────────────────────
  if (view === 'add') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">{editingRow ? 'Edit Recipient' : 'Add Recipient'}</h1>
            <p className="text-sm text-brand-textMuted mt-1">{editingRow ? 'Update recipient details' : 'Create a new recipient'}</p>
          </div>
          <Button variant="outlined" onClick={handleBack} className="rounded-lg px-6">
            Back to List
          </Button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-brand-border p-4 sm:p-8 max-w-full">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormInput
                label="First Name *"
                name="first_name"
                defaultValue={editingRow?.first_name || ''}
                placeholder="Enter first name"
                required
              />
              <FormInput
                label="Last Name *"
                name="last_name"
                defaultValue={editingRow?.last_name || ''}
                placeholder="Enter last name"
                required
              />
            </div>

            <FormInput
              label="Email"
              name="email"
              type="email"
              defaultValue={editingRow?.email || ''}
              placeholder="Enter email address"
            />

            <FormInput
              label="Phone"
              name="phone"
              defaultValue={editingRow?.phone || ''}
              placeholder="Enter phone number"
            />

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                name="active"
                id="active"
                className="w-5 h-5 rounded border-brand-border text-brand-blue focus:ring-brand-blue"
                defaultChecked={editingRow?.status === 'Active' || !editingRow}
              />
              <label htmlFor="active" className="text-sm font-semibold text-brand-textPrimary">Active</label>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" className="flex-1 py-3 bg-brand-blue text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                {editingRow ? 'Update Recipient' : 'Create Recipient'}
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

  // ── Recipients list view ──────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <TabBar tab={tab} setTab={setTab} onSwitchToRecipients={() => setView('list')} />

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">Recipients</h1>
          <p className="text-sm text-brand-textMuted">All recipients — manage contact information</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outlined" onClick={() => { fetchPrecincts(); setIsUploadModalOpen(true); }} className="inline-flex items-center">
            <Upload size={16} className="mr-2" /> Upload CSV / Excel
          </Button>
          <Button onClick={handleAdd}>+ Add Recipient</Button>
        </div>
      </div>

      <div className="w-full">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search recipients by name, email, or phone..."
            className="block w-full pl-10 pr-3 py-3 border border-brand-border rounded-xl focus:ring-brand-blue focus:border-brand-blue outline-none transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64 bg-white rounded-xl border border-brand-border">
          <p className="text-brand-textSecondary animate-pulse">Loading recipients...</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={voters}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyMessage="No recipients found"
          pageSize={25}
          pageSizes={[25, 50, 100]}
        />
      )}

      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => { setIsUploadModalOpen(false); setSelectedFile(null); }}
        title="Upload Recipients"
        hideSave={true}
      >
        <div className="space-y-5">
          {/* Format hint */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="flex justify-between items-start mb-3">
              <h4 className="text-sm font-bold text-brand-blue">File Format Requirements</h4>
              <button
                onClick={handleDownloadTemplate}
                className="text-xs flex items-center bg-white px-3 py-1.5 rounded-lg border border-blue-100 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Download size={14} className="mr-1" /> Download Template (.xlsx)
              </button>
            </div>
            <ul className="text-xs space-y-1.5 text-brand-blue">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-blue shrink-0" />
                Accepted formats: <code className="bg-blue-100 px-1 rounded">.csv</code> <code className="bg-blue-100 px-1 rounded">.xlsx</code> <code className="bg-blue-100 px-1 rounded">.xls</code>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-blue shrink-0" />
                Required columns: <code className="bg-blue-100 px-1 rounded">first_name</code> <code className="bg-blue-100 px-1 rounded">last_name</code>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-blue shrink-0" />
                Optional columns: <code className="bg-blue-100 px-1 rounded">email</code> <code className="bg-blue-100 px-1 rounded">phone</code> <code className="bg-blue-100 px-1 rounded">precinct</code> <code className="bg-blue-100 px-1 rounded">status</code>
              </li>
            </ul>
          </div>

          {/* Precinct hint */}
          {precincts.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
              <p className="text-xs font-bold text-amber-700 mb-1">
                💡 Precinct column — use one of these names:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {precincts.map((p) => (
                  <code key={p.id} className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded">
                    {p.name}
                  </code>
                ))}
              </div>
              {precincts.length === 1 && (
                <p className="text-[10px] text-amber-600 mt-1">
                  Only one precinct exists — rows without a precinct value will be auto-assigned to it.
                </p>
              )}
            </div>
          )}

          {/* File picker */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-brand-textPrimary">
              Select File
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv,.xlsx,.xls"
                className="hidden"
              />
              <button
                onClick={() => { fetchPrecincts(); fileInputRef.current?.click(); }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-brand-blue rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors"
              >
                <FileSpreadsheet size={15} />
                Choose file
              </button>
              <span className="text-sm text-gray-400 italic truncate max-w-[200px]">
                {selectedFile ? selectedFile.name : 'No file chosen'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className={`flex-1 py-3 rounded-xl font-bold transition-colors ${
                !selectedFile || isUploading
                  ? 'bg-gray-100 border-none text-brand-textSecondary'
                  : 'bg-brand-blue text-white'
              }`}
            >
              {isUploading ? 'Uploading…' : 'Upload'}
            </Button>
            <Button
              onClick={() => { setIsUploadModalOpen(false); setSelectedFile(null); }}
              variant="outlined"
              className="flex-1 py-3 border-brand-border text-brand-textSecondary text-sm rounded-xl"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Voters;

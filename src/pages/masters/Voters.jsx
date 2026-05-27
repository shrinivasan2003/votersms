import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../components/shared/DataTable';
import Button from '../../components/shared/Button';
import FormInput from '../../components/shared/FormInput';
import Badge from '../../components/shared/Badge';
import Modal from '../../components/shared/Modal';
import { Download, Upload, ArrowLeft } from 'lucide-react';

const Voters = () => {
  const navigate = useNavigate();
  const [view, setView] = useState('list'); // 'list' or 'add'
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [voters, setVoters] = useState([]);
  const [precincts, setPrecincts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const API_URL = '/api/voters';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [votersRes, precinctsRes] = await Promise.all([
        fetch(API_URL),
        fetch('/api/precincts')
      ]);
      const votersData = await votersRes.json();
      const precinctsData = await precinctsRes.json();
      setVoters(Array.isArray(votersData) ? votersData : []);
      setPrecincts(Array.isArray(precinctsData) ? precinctsData : []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns = [
    { header: 'NAME', render: (row) => `${row.first_name} ${row.last_name}` },
    { header: 'EMAIL', accessor: 'email' },
    { header: 'PHONE', accessor: 'phone' },
    { header: 'PRECINCT', accessor: 'precinct_name' },
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
      last_name: formData.get('last_name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      precinct_id: formData.get('precinct_id'),
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
        fetchData();
        handleBack();
      }
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
    if (file && file.type === "text/csv") {
      setSelectedFile(file);
    } else {
      alert("Please select a valid CSV file");
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const voters = lines.slice(1).filter(line => line.trim()).map(line => {
        const values = line.split(',').map(v => v.trim());
        const voter = {};
        headers.forEach((header, index) => {
          voter[header] = values[index];
        });
        return voter;
      });

      try {
        const res = await fetch(`${API_URL}/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(voters)
        });

        const result = await res.json();
        if (res.ok) {
          alert(`Successfully uploaded ${result.inserted} recipients.`);
          setIsUploadModalOpen(false);
          setSelectedFile(null);
          fetchData();
        } else {
          alert(result.message || 'Upload failed');
        }
      } catch (err) {
        console.error('Upload failed:', err);
        alert(`Upload Error: ${err.message}. Please check if the backend server is running.`);
      } finally {
        setIsUploading(false);
      }
    };

    reader.readAsText(selectedFile);
  };

  const handleDownloadTemplate = () => {
    const headers = ['first_name', 'last_name', 'precinct_id', 'email', 'phone'];
    const sampleData = [
      ['John', 'Doe', '1', 'john@example.com', '1234567890'],
      ['Jane', 'Smith', 'Main Street', 'jane@example.com', '0987654321']
    ];
    
    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'recipient_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (view === 'add') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-brand-navy">{editingRow ? 'Edit Recipient' : 'Add Recipient'}</h1>
            <p className="text-brand-textMuted mt-1">{editingRow ? 'Update recipient details' : 'Create a new recipient'}</p>
          </div>
          <Button variant="outlined" onClick={handleBack} className="rounded-lg px-6">
            Back to List
          </Button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-brand-border p-8 max-w-6xl">
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

            <div className="space-y-2">
              <label className="block text-sm font-medium text-brand-textPrimary">Precinct *</label>
              <select 
                name="precinct_id"
                className="block w-full rounded-md border border-brand-border px-3 py-3 outline-none focus:border-brand-blue focus:ring-brand-blue bg-white" 
                required 
                defaultValue={editingRow?.precinct_id || ''}
              >
                <option value="">Select Precinct</option>
                {precincts.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/lists')}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            title="Back to Lists"
          >
            <ArrowLeft size={18} className="text-brand-textSecondary" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-brand-navy">Recipients (Master List)</h1>
            <p className="text-brand-textMuted">All recipients — manage contact information</p>
          </div>
        </div>
        <div className="space-x-3">
          <Button variant="outlined" onClick={() => setIsUploadModalOpen(true)} className="inline-flex items-center">
            <Upload size={16} className="mr-2" /> Upload CSV
          </Button>
          <Button onClick={handleAdd}>+ Add Recipient</Button>
        </div>
      </div>

      <div className="w-full">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
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
        />
      )}

      <Modal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Recipients from CSV"
        hideSave={true}
      >
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="flex justify-between items-start mb-3">
              <h4 className="text-sm font-bold text-brand-blue">CSV Format Requirements:</h4>
              <button 
                onClick={handleDownloadTemplate}
                className="text-xs flex items-center bg-white px-3 py-1.5 rounded-lg border border-blue-100 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Download size={14} className="mr-1" /> Download Template
              </button>
            </div>
            <ul className="text-xs space-y-2 text-brand-blue">
              <li className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-brand-blue mr-2"></span> Required columns: <code className="bg-blue-100 px-1 rounded text-[10px]">first_name</code>, <code className="bg-blue-100 px-1 rounded text-[10px]">last_name</code>, <code className="bg-blue-100 px-1 rounded text-[10px]">precinct_id</code></li>
              <li className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-brand-blue mr-2"></span> Optional columns: <code className="bg-blue-100 px-1 rounded text-[10px]">email</code>, <code className="bg-blue-100 px-1 rounded text-[10px]">phone</code></li>
              <li className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-brand-blue mr-2"></span> Precinct can be ID, code, or name</li>
              <li className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-brand-blue mr-2"></span> File size limit: 10MB</li>
              <li className="flex items-start pt-1 font-medium italic"><span className="mr-2">💡</span> Tip: Download the template above to see the correct format with sample data</li>
            </ul>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-brand-textPrimary">Select CSV File</label>
            <div className="flex items-center space-x-4">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv"
                className="hidden"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-50 text-brand-blue rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors"
              >
                Choose file
              </button>
              <span className="text-sm text-gray-400 italic">
                {selectedFile ? selectedFile.name : 'No file chosen'}
              </span>
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || isUploading}
              className={`w-full py-3 rounded-xl font-bold transition-colors ${!selectedFile || isUploading ? 'bg-gray-100 border-none text-brand-textPrimary hover:bg-gray-200' : 'bg-brand-blue text-white'}`}
            >
              {isUploading ? 'Uploading...' : selectedFile ? 'Upload CSV' : 'Cancel'}
            </Button>
            <div className="flex justify-end pt-2">
              <Button 
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setSelectedFile(null);
                }} 
                variant="outlined"
                className="px-6 py-2 border-brand-border text-brand-textSecondary text-sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Voters;

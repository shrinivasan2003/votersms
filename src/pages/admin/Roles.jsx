import { useState, useEffect } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { rolesApi } from '../../api/users';

const Roles = () => {
  const [view, setView] = useState('list'); // 'list' or 'add'
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingRow, setEditingRow] = useState(null);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const data = await rolesApi.list();
      setRoles(Array.isArray(data) ? data : []);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

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
      description: formData.get('description'),
      status: formData.get('status') === 'on' ? 'Active' : 'Inactive'
    };

    try {
      if (editingRow) {
        await rolesApi.update(editingRow.id, data);
      } else {
        await rolesApi.create(data);
      }
      alert(`Role ${editingRow ? 'updated' : 'created'} successfully!`);
      await fetchRoles();
      handleBack();
    } catch (err) {
      alert(`Failed to save role: ${err.message}`);
    }
  };

  const handleEdit = (role) => {
    setEditingRow(role);
    setView('add');
  };

  const handleDelete = async (role) => {
    if (!window.confirm(`Are you sure you want to delete role ${role.name}?`)) return;
    try {
      await rolesApi.remove(role.id);
      fetchRoles();
    } catch (err) {
    }
  };

  if (view === 'add') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-brand-navy">{editingRow ? 'Edit Role' : 'Add Role'}</h1>
            <p className="text-brand-textMuted mt-1">{editingRow ? 'Update role information' : 'Create a new user role'}</p>
          </div>
          <button 
            onClick={handleBack}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-brand-textPrimary hover:bg-gray-50 transition-colors shadow-sm"
          >
            Back to List
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-brand-border p-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">Name *</label>
                <input 
                  type="text" 
                  name="name"
                  defaultValue={editingRow?.name || 'Administrator'}
                  placeholder="Enter role name"
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">Code *</label>
                <input 
                  type="text" 
                  name="code"
                  defaultValue={editingRow?.code || 'admin'}
                  placeholder="e.g., admin, user"
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                  required
                />
                <p className="text-xs text-brand-textMuted">Lowercase letters, numbers, underscores, and hyphens only</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">Description</label>
              <textarea 
                name="description"
                defaultValue={editingRow?.description || 'Full system access with all privileges'}
                placeholder="Enter role description"
                rows={4}
                className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all resize-none"
              ></textarea>
            </div>

            <div className="flex items-center gap-3">
              <input 
                type="checkbox" 
                name="status" 
                id="status"
                defaultChecked={editingRow ? editingRow.status === 'Active' : true}
                className="w-5 h-5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
              />
              <label htmlFor="status" className="text-sm font-bold text-brand-textPrimary">Active</label>
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                type="submit"
                className="flex-[2] py-3.5 bg-[#0047AB] text-white rounded-lg font-bold text-sm hover:bg-opacity-90 transition-all shadow-sm"
              >
                Update
              </button>
              <button 
                type="button"
                onClick={handleBack}
                className="flex-1 py-3.5 bg-[#e5e7eb] text-brand-textPrimary rounded-lg font-bold text-sm hover:bg-gray-300 transition-all"
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
          <h1 className="text-4xl font-bold text-brand-navy">Roles</h1>
          <p className="text-brand-textMuted mt-1">Manage user roles and access levels</p>
        </div>
        <button 
          onClick={() => setView('add')}
          className="bg-[#0047AB] text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-opacity-90 transition-all shadow-sm"
        >
          <span className="text-lg">+</span> Add Role
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-brand-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-brand-border">
            <thead className="bg-gray-50">
              <tr>
                {['ID', 'NAME', 'CODE', 'DESCRIPTION', 'STATUS', 'ACTIONS'].map((head) => (
                  <th key={head} className="px-8 py-5 text-left text-xs font-bold text-brand-textSecondary uppercase tracking-widest">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-brand-border">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-8 py-10 text-center text-brand-textSecondary animate-pulse font-medium">Loading roles...</td>
                </tr>
              ) : roles.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-8 py-10 text-center text-brand-textSecondary font-medium">No roles found</td>
                </tr>
              ) : roles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-8 py-5 whitespace-nowrap">
                    <span className="bg-gray-100 text-brand-textPrimary px-2 py-1 rounded text-xs font-bold">#{role.id}</span>
                  </td>
                  <td className="px-8 py-5 text-sm font-bold text-brand-textPrimary">{role.name}</td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <span className="bg-gray-100 text-brand-textSecondary px-3 py-1 rounded text-xs font-bold lowercase tracking-wider">
                      {role.code}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-sm text-brand-textSecondary max-w-xs">{role.description}</td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <span className={`px-4 py-1 rounded-full text-xs font-bold ${role.status === 'Active' ? 'bg-[#e6f7ef] text-[#27ae60]' : 'bg-gray-100 text-gray-500'}`}>
                      {role.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-4">
                      <button onClick={() => handleEdit(role)} className="text-blue-500 hover:text-blue-700 transition-colors">
                        <Pencil size={20} />
                      </button>
                      <button onClick={() => handleDelete(role)} className="text-red-500 hover:text-red-700 transition-colors">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Roles;

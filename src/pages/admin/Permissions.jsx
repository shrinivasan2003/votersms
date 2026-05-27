import { useState, useEffect } from 'react';
import { Pencil, Trash2, ChevronDown } from 'lucide-react';

const Permissions = () => {
  const [view, setView] = useState('list'); // 'list' or 'add'
  const [permissions, setPermissions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);

  const API_URL = '/api/permissions';
  const ROLES_API = '/api/roles';

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setPermissions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch(ROLES_API);
      const data = await res.json();
      setRoles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  useEffect(() => {
    fetchPermissions();
    fetchRoles();
  }, []);

  const handleBack = () => {
    setView('list');
    setEditingRow(null);
    setSelectedRoleIds([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      code: formData.get('code'),
      resource_path: formData.get('resource_path'),
      resource_type: formData.get('resource_type'),
      parent_menu: formData.get('parent_menu'),
      icon: formData.get('icon'),
      display_order: parseInt(formData.get('display_order')) || 0,
      description: formData.get('description'),
      status: 'Active',
      roleIds: selectedRoleIds
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
        alert(`Permission ${editingRow ? 'updated' : 'created'} successfully!`);
        fetchPermissions();
        handleBack();
      }
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleEdit = async (perm) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/${perm.id}`);
      const data = await res.json();
      setEditingRow(data);
      setSelectedRoleIds(data.roleIds || []);
      setView('add');
    } catch (err) {
      console.error('Failed to fetch permission details:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (roleId) => {
    setSelectedRoleIds(prev => 
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    );
  };

  const handleDelete = async (perm) => {
    if (!window.confirm(`Are you sure you want to delete permission ${perm.name}?`)) return;
    try {
      const res = await fetch(`${API_URL}/${perm.id}`, { method: 'DELETE' });
      if (res.ok) fetchPermissions();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  if (view === 'add') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-brand-navy">{editingRow ? 'Edit Permission' : 'Add Permission'}</h1>
            <p className="text-brand-textMuted mt-1">{editingRow ? 'Update system permission' : 'Create a new system permission'}</p>
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
                  defaultValue={editingRow?.name || ''}
                  placeholder="Enter permission name"
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
                  placeholder="Enter permission code"
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                  required
                />
                <p className="text-[10px] text-brand-textMuted mt-1">Lowercase letters, numbers, and underscores only</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">Resource Path *</label>
                <input 
                  type="text" 
                  name="resource_path"
                  defaultValue={editingRow?.resource_path || ''}
                  placeholder="e.g., /counties, /users"
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                  required
                />
                <p className="text-[10px] text-brand-textMuted mt-1">URL path for this permission</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">Resource Type</label>
                <div className="relative">
                  <select 
                    name="resource_type"
                    defaultValue={editingRow?.resource_type || 'Menu'}
                    className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue bg-white transition-all appearance-none"
                  >
                    <option value="Menu">Menu</option>
                    <option value="Action">Action</option>
                    <option value="API">API</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">Parent Menu</label>
                <input 
                  type="text" 
                  name="parent_menu"
                  defaultValue={editingRow?.parent_menu || ''}
                  placeholder="e.g., Masters, Transactions"
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                />
                <p className="text-[10px] text-brand-textMuted mt-1">Menu group name (optional)</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">Icon</label>
                <input 
                  type="text" 
                  name="icon"
                  defaultValue={editingRow?.icon || ''}
                  placeholder="e.g., bi-geo-alt"
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                />
                <p className="text-[10px] text-brand-textMuted mt-1">Bootstrap Icons class</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">Display Order</label>
                <input 
                  type="number" 
                  name="display_order"
                  defaultValue={editingRow?.display_order || 0}
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <label className="block text-sm font-bold text-brand-textPrimary">Roles Selection</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {roles.map(role => (
                  <label key={role.id} className="flex items-center space-x-3 p-3 border border-brand-border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={selectedRoleIds.includes(role.id)}
                      onChange={() => toggleRole(role.id)}
                      className="w-4 h-4 rounded border-brand-border text-brand-blue focus:ring-brand-blue"
                    />
                    <span className="text-sm font-medium text-brand-textPrimary">{role.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">Description</label>
              <textarea 
                name="description"
                defaultValue={editingRow?.description || ''}
                placeholder="Enter permission description"
                rows={3}
                className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all resize-none"
              ></textarea>
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                type="submit"
                className="flex-[2] py-3.5 bg-[#0047AB] text-white rounded-lg font-bold text-sm hover:bg-opacity-90 transition-all shadow-sm"
              >
                {editingRow ? 'Update' : 'Save'}
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
          <h1 className="text-4xl font-bold text-brand-navy">Permissions</h1>
          <p className="text-brand-textMuted mt-1">Manage system permissions and access controls</p>
        </div>
        <button 
          onClick={() => setView('add')}
          className="bg-[#0047AB] text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-opacity-90 transition-all shadow-sm"
        >
          <span className="text-lg">+</span> Add Permission
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-brand-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-brand-border">
            <thead className="bg-gray-50">
              <tr>
                {['ID', 'NAME', 'CODE', 'RESOURCE PATH', 'TYPE', 'PARENT MENU', 'ROLES', 'STATUS', 'ACTIONS'].map((head) => (
                  <th key={head} className="px-6 py-5 text-left text-[10px] font-bold text-brand-textSecondary uppercase tracking-widest whitespace-nowrap">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-brand-border">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-6 py-10 text-center text-brand-textSecondary animate-pulse font-medium">Loading permissions...</td>
                </tr>
              ) : permissions.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-10 text-center text-brand-textSecondary font-medium">No permissions found</td>
                </tr>
              ) : permissions.map((perm) => (
                <tr key={perm.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className="bg-gray-100 text-brand-textPrimary px-2 py-1 rounded text-[10px] font-bold">#{perm.id}</span>
                  </td>
                  <td className="px-6 py-5 text-sm font-bold text-brand-textPrimary whitespace-nowrap">{perm.name}</td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className="bg-gray-100 text-brand-textSecondary px-3 py-1 rounded text-[10px] font-bold lowercase tracking-wider">
                      {perm.code}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-xs text-brand-textSecondary whitespace-nowrap">{perm.resource_path}</td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className="bg-[#eef2ff] text-[#4f46e5] px-3 py-0.5 rounded text-[10px] font-bold border border-[#c7d2fe]">
                      {perm.resource_type}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-xs text-brand-textSecondary whitespace-nowrap">{perm.parent_menu || '-'}</td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded text-[10px] font-bold border border-blue-100">
                      {perm.role_count || 0} role(s)
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className={`px-4 py-1 rounded-full text-[10px] font-bold ${perm.status === 'Active' ? 'bg-[#e6f7ef] text-[#27ae60]' : 'bg-gray-100 text-gray-500'}`}>
                      {perm.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <button onClick={() => handleEdit(perm)} className="text-blue-500 hover:text-blue-700 transition-colors">
                        <Pencil size={18} />
                      </button>
                      <button onClick={() => handleDelete(perm)} className="text-red-500 hover:text-red-700 transition-colors">
                        <Trash2 size={18} />
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

export default Permissions;

import { useState, useEffect } from 'react';
import { Pencil, Trash2, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Users = () => {
  const [view, setView] = useState('list'); // 'list' or 'add'
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const { getAuthHeaders } = useAuth();

  const API_URL = '/api/users';

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        headers: { ...getAuthHeaders() },
      });
      const data = await res.json();
      console.log('Fetched users:', data);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleBack = () => {
    setView('list');
    setEditingRow(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      username: formData.get('username'),
      email: formData.get('email'),
      full_name: formData.get('full_name'),
      role: formData.get('role'),
      status: formData.get('active') === 'on' ? 'Active' : 'Inactive'
    };

    if (!editingRow) {
      data.password = formData.get('password');
    }

    console.log('Saving user data:', data);

    try {
      const method = editingRow ? 'PUT' : 'POST';
      const url = editingRow ? `${API_URL}/${editingRow.id}` : API_URL;
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        console.log('User saved successfully');
        await fetchUsers();
        handleBack();
      } else {
        const errorData = await res.json();
        console.error('Save failed:', errorData);
        alert('Save failed. Please check the console for details.');
      }
    } catch (err) {
      console.error('Save failed:', err);
      alert('Network error. Is the server running?');
    }
  };

  const handleDelete = async (rowUser) => {
    if (!window.confirm(`Are you sure you want to delete user ${rowUser.username}?`)) return;
    try {
      const res = await fetch(`${API_URL}/${rowUser.id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeaders() },
      });
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleEdit = (user) => {
    setEditingRow(user);
    setView('add');
  };

  if (view === 'add') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-brand-navy">{editingRow ? 'Edit User' : 'Add User'}</h1>
            <p className="text-brand-textMuted mt-1">{editingRow ? 'Update user details' : 'Create a new user'}</p>
          </div>
          <button 
            onClick={handleBack}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-brand-textPrimary hover:bg-gray-50 transition-colors shadow-sm"
          >
            Back to List
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-brand-border p-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">Username *</label>
              <input 
                type="text" 
                name="username"
                defaultValue={editingRow?.username || ''}
                placeholder="Enter username"
                className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                required
              />
            </div>

            {!editingRow && (
              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">Password *</label>
                <input 
                  type="password" 
                  name="password"
                  placeholder="Enter password"
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">Email *</label>
              <input 
                type="email" 
                name="email"
                defaultValue={editingRow?.email || ''}
                placeholder="Enter email address"
                className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">Full Name</label>
              <input 
                type="text" 
                name="full_name"
                defaultValue={editingRow?.full_name || ''}
                placeholder="Enter full name"
                className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">Role *</label>
              <div className="relative">
                <select 
                  name="role"
                  defaultValue={editingRow?.role || 'User'}
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue bg-white transition-all appearance-none"
                >
                  <option value="User">User</option>
                  <option value="Admin">Admin</option>
                </select>
                <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input 
                type="checkbox" 
                name="active"
                id="active" 
                defaultChecked={editingRow ? editingRow.status === 'Active' : true}
                className="w-5 h-5 rounded border-gray-300 text-[#0047AB] focus:ring-[#0047AB]"
              />
              <label htmlFor="active" className="text-sm font-bold text-brand-textPrimary">Active</label>
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                type="submit"
                className="flex-1 py-3.5 bg-[#0047AB] text-white rounded-lg font-bold text-sm hover:bg-opacity-90 transition-all shadow-sm"
              >
                {editingRow ? 'Update' : 'Create'}
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
          <h1 className="text-4xl font-bold text-brand-navy">Users</h1>
          <p className="text-brand-textMuted mt-1">Manage system users</p>
        </div>
        <button 
          onClick={() => setView('add')}
          className="bg-[#0047AB] text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-opacity-90 transition-all shadow-sm"
        >
          <span className="text-lg">+</span> Add User
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-brand-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-brand-border">
            <thead className="bg-gray-50">
              <tr>
                {['USERNAME', 'EMAIL', 'FULL NAME', 'ROLE', 'STATUS', 'ACTIONS'].map((head) => (
                  <th key={head} className="px-8 py-5 text-left text-xs font-bold text-brand-textSecondary uppercase tracking-widest">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-brand-border">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-8 py-10 text-center text-brand-textSecondary animate-pulse font-medium">Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-8 py-10 text-center text-brand-textSecondary font-medium">No users found</td>
                </tr>
              ) : users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-8 py-5 text-sm font-bold text-brand-textPrimary">{user.username}</td>
                  <td className="px-8 py-5 text-sm text-brand-textSecondary">{user.email}</td>
                  <td className="px-8 py-5 text-sm text-brand-textSecondary">{user.full_name || '-'}</td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <span className="bg-[#eef2ff] text-[#4f46e5] px-4 py-1 rounded-full text-xs font-bold border border-[#c7d2fe]">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <span className={`px-4 py-1 rounded-full text-xs font-bold ${user.status === 'Active' ? 'bg-[#e6f7ef] text-[#27ae60]' : 'bg-gray-100 text-gray-500'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-4">
                      <button onClick={() => handleEdit(user)} className="text-blue-500 hover:text-blue-700 transition-colors">
                        <Pencil size={20} />
                      </button>
                      <button onClick={() => handleDelete(user)} className="text-red-500 hover:text-red-700 transition-colors">
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

export default Users;

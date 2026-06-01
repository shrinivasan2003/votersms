import { useState, useEffect, useRef } from 'react';
import { ListChecks, Plus, Users, Upload, Download, ArrowLeft, Trash2, Search, X, Star, Edit2, RefreshCw, UserPlus, Check, Tag, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Badge from '../../components/shared/Badge';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';

const StatusBadge = ({ status }) => (
  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
    status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
  }`}>
    {status}
  </span>
);

// ── Main Component ────────────────────────────────────────────────────────────
const Lists = () => {
  const navigate = useNavigate();
  const [view, setView] = useState('list'); // 'list' | 'create' | 'detail'
  const [lists, setLists] = useState([]);
  const [masterCount, setMasterCount] = useState(0);
  const [selectedList, setSelectedList] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create / Edit form
  const [form, setForm] = useState({ name: '', description: '', status: 'Active' });
  const [editingList, setEditingList] = useState(null);

  // Member search (add one by one)
  const [memberSearch, setMemberSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addMsg, setAddMsg] = useState('');
  const [addError, setAddError] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [defaultVoters, setDefaultVoters] = useState([]);

  // CSV upload modal
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Meta tags
  const [metaTags, setMetaTags] = useState([]);
  const [isAddTagOpen, setIsAddTagOpen] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState('');
  const [tagSaving, setTagSaving] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchLists = async () => {
    setLoading(true);
    try {
      const [listsRes, masterRes] = await Promise.all([
        fetch('/api/contact-lists'),
        fetch('/api/contact-lists/master-count'),
      ]);
      const listsData = await listsRes.json();
      const masterData = await masterRes.json();
      setLists(Array.isArray(listsData) ? listsData : []);
      setMasterCount(masterData.count || 0);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (listId) => {
    setMembersLoading(true);
    try {
      const res = await fetch(`/api/contact-lists/${listId}/members`);
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
    } finally {
      setMembersLoading(false);
    }
  };

  const fetchMetaTags = async (listId) => {
    try {
      const res = await fetch(`/api/contact-lists/${listId}/meta-tags`);
      const data = await res.json();
      setMetaTags(Array.isArray(data) ? data : []);
    } catch (err) {
    }
  };

  useEffect(() => { fetchLists(); }, []);

  // Debounced voter search
  useEffect(() => {
    if (!memberSearch.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/voters?search=${encodeURIComponent(memberSearch)}`);
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data.slice(0, 8) : []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [memberSearch]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openDetail = (list) => {
    setSelectedList(list);
    setView('detail');
    fetchMembers(list.id);
    fetchMetaTags(list.id);
    setMemberSearch('');
    setSearchResults([]);
    setAddMsg('');
    setAddError('');
    setMetaTags([]);
    setIsAddTagOpen(false);
    setNewTagLabel('');
    setDefaultVoters([]);
    // Pre-load recipients so the user sees something to pick from immediately
    fetch('/api/voters')
      .then(r => r.json())
      .then(data => setDefaultVoters(Array.isArray(data) ? data.slice(0, 15) : []))
      .catch(() => {});
  };

  const openCreate = (listToEdit = null) => {
    setEditingList(listToEdit);
    setForm(listToEdit
      ? { name: listToEdit.name, description: listToEdit.description || '', status: listToEdit.status }
      : { name: '', description: '', status: 'Active' }
    );
    setView('create');
  };

  const handleSaveList = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingList ? 'PUT' : 'POST';
      const url = editingList ? `/api/contact-lists/${editingList.id}` : '/api/contact-lists';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        await fetchLists();
        setView('list');
        setEditingList(null);
      }
    } catch (err) {
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteList = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this list and remove all its members?')) return;
    try {
      await fetch(`/api/contact-lists/${id}`, { method: 'DELETE' });
      fetchLists();
    } catch (err) {
    }
  };

  const handleAddMember = async (voter) => {
    setAddError('');
    try {
      const res = await fetch(`/api/contact-lists/${selectedList.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter_id: voter.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setAddError(err.detail || 'Failed to add — recipient may already be in this list.');
        setTimeout(() => setAddError(''), 4000);
        return;
      }
      setAddMsg(`✓ Added ${voter.first_name} ${voter.last_name}`);
      setMemberSearch('');
      setSearchResults([]);
      fetchMembers(selectedList.id);
      setSelectedList(prev => ({ ...prev, member_count: (prev.member_count || 0) + 1 }));
      setTimeout(() => setAddMsg(''), 3000);
    } catch (err) {
      setAddError('Connection error. Please try again.');
      setTimeout(() => setAddError(''), 4000);
    }
  };

  const handleRemoveMember = async (voterId, name) => {
    if (!window.confirm(`Remove ${name} from this list?`)) return;
    try {
      await fetch(`/api/contact-lists/${selectedList.id}/members/${voterId}`, { method: 'DELETE' });
      fetchMembers(selectedList.id);
      setSelectedList(prev => ({ ...prev, member_count: Math.max((prev.member_count || 1) - 1, 0) }));
    } catch (err) {
    }
  };

  // CSV upload
  const handleCsvUpload = async () => {
    if (!csvFile) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const rows = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj = {};
        headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
        return obj;
      }).filter(r => r.email || r.voter_id);

      try {
        const res = await fetch(`/api/contact-lists/${selectedList.id}/members/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rows),
        });
        const result = await res.json();
        const parts = [];
        if (result.added > 0) parts.push(`${result.added} new member(s) added`);
        if (result.updated > 0) parts.push(`${result.updated} existing member(s) updated with new tag values`);
        if (result.skipped > 0) parts.push(`${result.skipped} skipped (email not found in system)`);
        alert(parts.length ? parts.join('\n') : 'No changes made.');
        setIsUploadOpen(false);
        setCsvFile(null);
        fetchMembers(selectedList.id);
        fetchLists();
      } catch (err) {
        alert('Upload failed: ' + err.message);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsText(csvFile);
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch(`/api/contact-lists/${selectedList.id}/csv-template`);
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedList.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_template.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
    }
  };

  const handleAddTag = async () => {
    const label = newTagLabel.trim();
    if (!label) return;
    setTagSaving(true);
    try {
      const res = await fetch(`/api/contact-lists/${selectedList.id}/meta-tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_label: label }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'Failed to add tag');
        return;
      }
      setNewTagLabel('');
      setIsAddTagOpen(false);
      fetchMetaTags(selectedList.id);
    } catch (err) {
    } finally {
      setTagSaving(false);
    }
  };

  const handleDeleteTag = async (tagKey) => {
    if (!window.confirm(`Delete meta tag "{{${tagKey}}}"? This will remove all stored values for this tag.`)) return;
    try {
      await fetch(`/api/contact-lists/${selectedList.id}/meta-tags/${tagKey}`, { method: 'DELETE' });
      fetchMetaTags(selectedList.id);
    } catch (err) {
    }
  };

  // ── Create / Edit View ────────────────────────────────────────────────────

  if (view === 'create') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">
              {editingList ? 'Edit List' : 'Create New List'}
            </h1>
            <p className="text-sm text-brand-textMuted mt-1">
              {editingList ? 'Update list name and settings' : 'Define a named group of recipients'}
            </p>
          </div>
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-brand-textPrimary hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Lists
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-brand-border p-4 sm:p-8 max-w-full sm:max-w-2xl">
          <form onSubmit={handleSaveList} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">List Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Spring Campaign, Newsletter Subscribers"
                className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Optional notes about this list..."
                className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">Status</label>
              <div className="flex gap-4">
                {['Active', 'Inactive'].map(s => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value={s}
                      checked={form.status === s}
                      onChange={() => setForm({ ...form, status: s })}
                      className="accent-brand-blue"
                    />
                    <span className="text-sm font-medium text-brand-textPrimary">{s}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 bg-[#0047AB] text-white rounded-lg font-bold text-sm hover:bg-opacity-90 transition-all disabled:opacity-50"
              >
                {saving ? 'Saving…' : editingList ? 'Update List' : 'Create List'}
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                className="flex-1 py-3 bg-gray-100 text-brand-textPrimary rounded-lg font-bold text-sm hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── List Detail View ──────────────────────────────────────────────────────

  if (view === 'detail' && selectedList) {
    const memberIds = new Set(members.map(m => m.voter_id));
    const displayList = memberSearch.trim()
      ? searchResults.filter(v => !memberIds.has(v.id))
      : defaultVoters.filter(v => !memberIds.has(v.id));
    const showNoResults = !!memberSearch.trim() && !isSearching && displayList.length === 0;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setView('list'); setSelectedList(null); }}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors shrink-0"
            >
              <ArrowLeft size={18} className="text-brand-textSecondary" />
            </button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">{selectedList.name}</h1>
                <StatusBadge status={selectedList.status} />
              </div>
              {selectedList.description && (
                <p className="text-sm text-brand-textMuted mt-1">{selectedList.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => openCreate(selectedList)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-brand-textPrimary hover:bg-gray-50 transition-colors"
            >
              <Edit2 size={15} /> Edit List
            </button>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-brand-textPrimary hover:bg-gray-50 transition-colors"
            >
              <Upload size={15} /> Upload CSV
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#0047AB] rounded-xl p-5 text-white">
            <p className="text-[10px] font-medium opacity-90 mb-1 uppercase tracking-wider">Members</p>
            <p className="text-3xl font-bold">{members.length}</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-brand-border">
            <p className="text-[10px] font-medium text-brand-textSecondary mb-1 uppercase tracking-wider">Created</p>
            <p className="text-xl font-bold text-brand-textPrimary">{fmtDate(selectedList.created_at)}</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-brand-border">
            <p className="text-[10px] font-medium text-brand-textSecondary mb-1 uppercase tracking-wider">Status</p>
            <p className="text-xl font-bold text-brand-textPrimary">{selectedList.status}</p>
          </div>
        </div>

        {/* Meta Tags */}
        <div className="bg-white rounded-xl shadow-sm border border-brand-border overflow-hidden">
          <div className="bg-gray-50 border-b border-brand-border px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Tag size={18} className="text-indigo-600" />
              <h3 className="font-bold text-brand-textPrimary">Meta Tags</h3>
              <span className="text-xs text-brand-textMuted">Custom fields for this list's members</span>
            </div>
            <button
              onClick={() => { setIsAddTagOpen(v => !v); setNewTagLabel(''); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <Plus size={13} /> Add Tag
            </button>
          </div>
          <div className="px-6 py-4 space-y-3">
            {/* Add tag inline form */}
            {isAddTagOpen && (
              <div className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                <input
                  type="text"
                  value={newTagLabel}
                  onChange={e => setNewTagLabel(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } if (e.key === 'Escape') setIsAddTagOpen(false); }}
                  placeholder="Tag name, e.g. Voter District"
                  autoFocus
                  className="flex-1 text-sm border border-indigo-200 rounded px-3 py-1.5 outline-none focus:border-indigo-400"
                />
                {newTagLabel.trim() && (
                  <span className="text-xs font-mono text-indigo-500 whitespace-nowrap">
                    {`{{${newTagLabel.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}}}`}
                  </span>
                )}
                <button
                  onClick={handleAddTag}
                  disabled={!newTagLabel.trim() || tagSaving}
                  className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {tagSaving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => { setIsAddTagOpen(false); setNewTagLabel(''); }}
                  className="p-1.5 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Tag chips */}
            <div className="flex flex-wrap gap-2">
              {metaTags.map(tag => (
                <div
                  key={tag.tag_key}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                    tag.is_default
                      ? 'bg-gray-100 text-gray-600 border-gray-200'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  }`}
                >
                  {tag.is_default
                    ? <Lock size={11} className="text-gray-400" />
                    : <Tag size={11} className="text-indigo-500" />
                  }
                  <span className="font-mono">{`{{${tag.tag_key}}}`}</span>
                  <span className="text-[10px] opacity-70">— {tag.tag_label}</span>
                  {!tag.is_default && (
                    <button
                      onClick={() => handleDeleteTag(tag.tag_key)}
                      className="ml-1 text-indigo-400 hover:text-red-500 transition-colors"
                      title="Delete tag"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
              {metaTags.length === 0 && (
                <p className="text-sm text-brand-textMuted">Loading tags…</p>
              )}
            </div>
            <p className="text-xs text-brand-textMuted">
              Default tags (<Lock size={10} className="inline" />) come from each recipient's profile. Custom tags let you store extra data per member — include them in your CSV upload or use <code className="bg-gray-100 px-1 rounded">{'{{tag_key}}'}</code> in templates.
            </p>
          </div>
        </div>

        {/* Add Member search */}
        <div className="bg-white rounded-xl shadow-sm border border-brand-border overflow-hidden">
          <div className="bg-[#0047AB] px-6 py-4 flex items-center gap-3">
            <UserPlus size={20} className="text-white" />
            <h3 className="font-bold text-white">Add Member</h3>
          </div>
          <div className="p-6">
            {addMsg && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium">
                <Check size={16} /> {addMsg}
              </div>
            )}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {isSearching
                  ? <RefreshCw size={18} className="text-gray-400 animate-spin" />
                  : <Search size={18} className="text-gray-400" />}
              </div>
              <input
                type="text"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                placeholder="Search recipients by name, email or phone…"
                className="block w-full pl-10 pr-10 py-3 border border-brand-border rounded-lg outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
              />
              {memberSearch && (
                <button
                  onClick={() => { setMemberSearch(''); setSearchResults([]); }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {addError && (
              <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
                <X size={16} /> {addError}
              </div>
            )}

            <p className="mt-2 text-xs text-brand-textMuted">
              💡 Recipients must first be in your{' '}
              <button
                type="button"
                onClick={() => navigate('/recipients')}
                className="text-[#0047AB] font-semibold hover:underline"
              >
                Master List
              </button>{' '}
              before they can be added to a custom list.
            </p>

            {searchFocused && (
              <>
                {showNoResults && (
                  <div className="mt-2 border border-brand-border rounded-lg p-4 text-center text-sm text-brand-textMuted">
                    No recipients found for "<strong>{memberSearch}</strong>". Try a different name, email or phone, or{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/recipients')}
                      className="text-[#0047AB] font-semibold hover:underline"
                    >
                      add them to the Master List first
                    </button>.
                  </div>
                )}

                {displayList.length > 0 && (
                  <div className="mt-2 border border-brand-border rounded-lg overflow-hidden shadow-sm">
                    {!memberSearch.trim() && (
                      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs text-brand-textMuted font-medium">
                        Recent recipients — type to search
                      </div>
                    )}
                    {displayList.map(v => (
                      <button
                        key={v.id}
                        type="button"
                        onMouseDown={e => { e.preventDefault(); handleAddMember(v); }}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0 text-left"
                      >
                        <div>
                          <p className="text-sm font-bold text-brand-textPrimary">{v.first_name} {v.last_name}</p>
                          <p className="text-xs text-brand-textSecondary">{v.email || '—'} · {v.phone || '—'}</p>
                        </div>
                        <span className="text-xs font-bold text-[#0047AB] flex items-center gap-1">
                          <Plus size={14} /> Add
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Members table */}
        <div className="bg-white rounded-xl shadow-sm border border-brand-border overflow-hidden">
          <div className="bg-gray-50 border-b border-brand-border px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users size={20} className="text-brand-textPrimary" />
              <h3 className="font-bold text-brand-textPrimary">Members</h3>
            </div>
            {membersLoading && <RefreshCw size={16} className="text-gray-400 animate-spin" />}
            {!membersLoading && members.length > 0 && (
              <span className="bg-blue-100 text-[#0047AB] text-xs font-bold px-2.5 py-1 rounded-full">
                {members.length} member{members.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {membersLoading ? (
            <div className="flex items-center justify-center h-32 text-brand-textMuted animate-pulse">
              Loading members…
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-brand-textMuted">
              <Users size={40} className="text-gray-200 mb-3" />
              <p className="font-medium">No members yet</p>
              <p className="text-xs text-gray-400 mt-1">Search above or upload a CSV to add members</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-brand-border">
                <thead className="bg-gray-50">
                  <tr>
                    {['NAME', 'EMAIL', 'PHONE', 'PRECINCT', 'ADDED', 'ACTION'].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-brand-border">
                  {members.map(m => (
                    <tr key={m.voter_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-brand-textPrimary whitespace-nowrap">
                        {m.first_name} {m.last_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-brand-textSecondary">{m.email || '—'}</td>
                      <td className="px-6 py-4 text-sm text-brand-textSecondary whitespace-nowrap">{m.phone || '—'}</td>
                      <td className="px-6 py-4 text-sm text-brand-textSecondary whitespace-nowrap">{m.precinct_name || '—'}</td>
                      <td className="px-6 py-4 text-sm text-brand-textMuted whitespace-nowrap">{fmtDate(m.added_at)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleRemoveMember(m.voter_id, `${m.first_name} ${m.last_name}`)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                          title="Remove from list"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* CSV Upload Modal */}
        {isUploadOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setIsUploadOpen(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="bg-[#0047AB] text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
                <h2 className="font-bold text-lg">Upload Members via CSV</h2>
                <button onClick={() => setIsUploadOpen(false)} className="text-blue-200 hover:text-white text-2xl font-bold w-8 h-8 flex items-center justify-center">✕</button>
              </div>
              <div className="p-6 space-y-5">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-bold text-brand-blue">CSV Format</h4>
                    <button onClick={handleDownloadTemplate} className="text-xs flex items-center bg-white px-3 py-1.5 rounded-lg border border-blue-100 text-gray-600 hover:bg-gray-50">
                      <Download size={13} className="mr-1" /> Template
                    </button>
                  </div>
                  <ul className="text-xs space-y-1.5 text-brand-blue">
                    <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-brand-blue" /> Required: <code className="bg-blue-100 px-1 rounded">email</code></li>
                    <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-brand-blue" /> Default: <code className="bg-blue-100 px-1 rounded">first_name</code>, <code className="bg-blue-100 px-1 rounded">last_name</code>, <code className="bg-blue-100 px-1 rounded">phone</code></li>
                    <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-brand-blue" /> Custom tag columns are saved per member</li>
                    <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-brand-blue" /> Recipients must already exist in the system</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-brand-textPrimary">Select CSV File</label>
                  <div className="flex items-center gap-3">
                    <input type="file" ref={fileInputRef} onChange={e => setCsvFile(e.target.files[0])} accept=".csv" className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-blue-50 text-brand-blue rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors">
                      Choose file
                    </button>
                    <span className="text-sm text-gray-400 italic">{csvFile ? csvFile.name : 'No file chosen'}</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleCsvUpload}
                    disabled={!csvFile || isUploading}
                    className="flex-1 py-3 bg-[#0047AB] text-white rounded-lg font-bold text-sm hover:bg-opacity-90 disabled:opacity-50 transition-all"
                  >
                    {isUploading ? 'Uploading…' : 'Upload CSV'}
                  </button>
                  <button onClick={() => { setIsUploadOpen(false); setCsvFile(null); }} className="flex-1 py-3 bg-gray-100 text-brand-textPrimary rounded-lg font-bold text-sm hover:bg-gray-200 transition-all">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Main Lists View ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">Contact Lists</h1>
          <p className="text-sm text-brand-textMuted mt-1">Organise recipients into targeted groups for your campaigns</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchLists}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-brand-textPrimary hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => openCreate()}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0047AB] text-white rounded-lg text-sm font-bold hover:bg-opacity-90 transition-all shadow-sm"
          >
            <Plus size={16} /> Create List
          </button>
        </div>
      </div>

      {/* Master List card */}
      <div
        onClick={() => navigate('/recipients')}
        className="bg-gradient-to-r from-[#0047AB] to-[#1a56db] rounded-xl p-6 text-white cursor-pointer hover:shadow-md transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Star size={22} className="text-yellow-300" fill="currentColor" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">Master List</h2>
                <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Built-in</span>
              </div>
              <p className="text-blue-200 text-sm mt-0.5">All recipients — everyone in the system with an email address</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold">{masterCount.toLocaleString()}</p>
            <p className="text-blue-200 text-sm">active recipients</p>
          </div>
        </div>
        <p className="mt-3 text-blue-200 text-xs group-hover:text-white transition-colors">
          Click to manage all recipients →
        </p>
      </div>

      {/* User lists */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-brand-border p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : lists.length === 0 ? (
        <div className="bg-white rounded-xl border border-brand-border flex flex-col items-center justify-center py-16 px-6 text-center">
          <ListChecks size={52} className="text-gray-200 mb-4" />
          <h3 className="text-lg font-bold text-brand-textPrimary mb-1">No lists yet</h3>
          <p className="text-brand-textMuted text-sm mb-6">Create your first list to target specific groups of recipients</p>
          <button
            onClick={() => openCreate()}
            className="flex items-center gap-2 px-6 py-3 bg-[#0047AB] text-white rounded-lg font-bold text-sm hover:bg-opacity-90 transition-all"
          >
            <Plus size={16} /> Create First List
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map(list => (
            <div
              key={list.id}
              onClick={() => openDetail(list)}
              className="bg-white rounded-xl border border-brand-border p-6 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-brand-textPrimary text-lg truncate group-hover:text-[#0047AB] transition-colors">
                    {list.name}
                  </h3>
                  {list.description && (
                    <p className="text-brand-textMuted text-sm mt-0.5 line-clamp-2">{list.description}</p>
                  )}
                </div>
                <StatusBadge status={list.status} />
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2 text-brand-textSecondary">
                  <Users size={16} />
                  <span className="text-sm font-bold text-brand-textPrimary">{list.member_count || 0}</span>
                  <span className="text-sm">member{list.member_count !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={e => { e.stopPropagation(); openCreate(list); }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-[#0047AB] hover:bg-blue-50 transition-colors"
                    title="Edit list"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={e => handleDeleteList(list.id, e)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete list"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-brand-textMuted mt-3">Created {fmtDate(list.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Lists;

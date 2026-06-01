import { useState, useEffect, useRef } from 'react';
import { emailTemplatesApi } from '../../api/email';
import DataTable from '../../components/shared/DataTable';
import Button from '../../components/shared/Button';
import Badge from '../../components/shared/Badge';
import ListTagPicker from '../../components/shared/ListTagPicker';
import { useNadia } from '../../contexts/NadiaContext';

const EmailTemplates = () => {
  const [view, setView] = useState('list'); // 'list' or 'add'
  const [editingRow, setEditingRow] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const bodyRef    = useRef(null);
  const subjectRef = useRef(null);
  const [format, setFormat]             = useState('Plain Text');
  const [metaTags, setMetaTags]         = useState([]);
  const [nadiaFormat, setNadiaFormat]   = useState('Plain Text');
  const { setEmailContext }             = useNadia();

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await emailTemplatesApi.list();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const columns = [
    { header: 'CODE', accessor: 'code' },
    { header: 'NAME', accessor: 'name' },
    { header: 'SUBJECT', accessor: 'subject' },
    { 
      header: 'BODY PREVIEW', 
      render: (row) => (
        <span className="text-brand-textMuted text-sm truncate block max-w-xs">
          {row.body?.length > 50 ? `${row.body.substring(0, 50)}...` : row.body}
        </span>
      )
    },
    {
      header: 'CC / BCC',
      render: (row) => (
        <div className="text-xs space-y-0.5">
          {row.cc       && <div className="text-blue-600 truncate max-w-[140px]" title={row.cc}>CC: {row.cc}</div>}
          {row.bcc      && <div className="text-gray-500 truncate max-w-[140px]" title={row.bcc}>BCC: {row.bcc}</div>}
          {row.reply_to && <div className="text-green-600 truncate max-w-[140px]" title={row.reply_to}>Reply: {row.reply_to}</div>}
          {!row.cc && !row.bcc && !row.reply_to && <span className="text-gray-300">—</span>}
        </div>
      )
    },
    {
      header: 'STATUS',
      render: (row) => (
        <Badge variant={row.status === 'Active' ? 'success' : 'default'}>
          {row.status}
        </Badge>
      )
    }
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

  // Called by NadiaAI when user clicks "Use This Template"
  const handleNadiaUse = ({ subject, body }) => {
    if (subjectRef.current) subjectRef.current.value = subject;
    if (bodyRef.current)    bodyRef.current.value    = body;
    setFormat(nadiaFormat);
  };

  // Register email context with global Nadia when form is open; clear on close
  useEffect(() => {
    if (view === 'add') {
      setEmailContext({
        variables: [
          '{{FirstName}}', '{{LastName}}', '{{FullName}}',
          ...metaTags.map(t => `{{${t.tag_key}}}`),
        ],
        onUseTemplate: handleNadiaUse,
      });
    } else {
      setEmailContext(null);
    }
    return () => setEmailContext(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, metaTags, nadiaFormat]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      code:     formData.get('code'),
      name:     formData.get('name'),
      subject:  formData.get('subject'),
      body:     formData.get('body'),
      status:   formData.get('active') === 'on' ? 'Active' : 'Inactive',
      type:     format,
      cc:       formData.get('cc')       || null,
      bcc:      formData.get('bcc')      || null,
      reply_to: formData.get('reply_to') || null,
    };

    try {
      if (editingRow) {
        await emailTemplatesApi.update(editingRow.id, data);
      } else {
        await emailTemplatesApi.create(data);
      }
      fetchTemplates();
      handleBack();
    } catch (err) {
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Are you sure you want to delete ${row.name}?`)) return;
    
    try {
      await emailTemplatesApi.remove(row.id);
      fetchTemplates();
    } catch (err) {
    }
  };

  if (view === 'add') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">{editingRow ? 'Edit Email Template' : 'Add Email Template'}</h1>
            <p className="text-sm text-brand-textMuted mt-1">{editingRow ? 'Update existing email template' : 'Create a new email template'}</p>
          </div>
          <button
            onClick={handleBack}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-brand-textPrimary hover:bg-gray-50 transition-colors"
          >
            Back to List
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-brand-border p-4 sm:p-8 max-w-full">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">Code *</label>
              <input 
                type="text"
                name="code"
                defaultValue={editingRow?.code || ''} 
                placeholder="e.g., WELCOME_EMAIL"
                className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                required 
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">Name *</label>
              <input 
                type="text"
                name="name"
                defaultValue={editingRow?.name || ''} 
                className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                required 
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">Subject *</label>
              <input
                ref={subjectRef}
                type="text"
                name="subject"
                placeholder="Email subject line"
                defaultValue={editingRow?.subject || ''}
                className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                required
              />
            </div>

            {/* CC / BCC / Reply-To */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">CC <span className="font-normal text-brand-textMuted">(optional)</span></label>
                <input
                  type="text"
                  name="cc"
                  placeholder="cc@example.com, cc2@example.com"
                  defaultValue={editingRow?.cc || ''}
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">BCC <span className="font-normal text-brand-textMuted">(optional)</span></label>
                <input
                  type="text"
                  name="bcc"
                  placeholder="bcc@example.com"
                  defaultValue={editingRow?.bcc || ''}
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">Reply-To <span className="font-normal text-brand-textMuted">(optional)</span></label>
                <input
                  type="email"
                  name="reply_to"
                  placeholder="reply@example.com"
                  defaultValue={editingRow?.reply_to || ''}
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                />
              </div>
            </div>
            <p className="text-xs text-brand-textMuted -mt-2">CC and BCC are applied to every email sent in a bulk job. Separate multiple addresses with commas.</p>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-bold text-brand-textPrimary">Message Body *</label>
                <div className="flex rounded-md overflow-hidden border border-gray-200">
                  <button
                    type="button"
                    onClick={() => { setFormat('Plain Text'); setNadiaFormat('Plain Text'); }}
                    className={`px-3 py-1 text-[11px] font-bold transition-all ${format === 'Plain Text' ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    Plain Text
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFormat('HTML'); setNadiaFormat('HTML'); }}
                    className={`px-3 py-1 text-[11px] font-bold transition-all ${format === 'HTML' ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    HTML
                  </button>
                </div>
              </div>

              {format === 'HTML' && (
                <div className="flex items-center space-x-1 p-2 bg-white border border-brand-border rounded-t-lg border-b-0 overflow-x-auto">
                  <button type="button" className="p-1.5 hover:bg-gray-100 rounded text-gray-600 font-bold min-w-[32px]">B</button>
                  <button type="button" className="p-1.5 hover:bg-gray-100 rounded text-gray-600 italic min-w-[32px]">I</button>
                  <button type="button" className="p-1.5 hover:bg-gray-100 rounded text-gray-600 line-through min-w-[32px]">S</button>
                  <div className="w-px h-6 bg-gray-200 mx-1" />
                  <button type="button" className="p-1.5 hover:bg-gray-100 rounded text-gray-600 text-xs font-bold">H1</button>
                  <button type="button" className="p-1.5 hover:bg-gray-100 rounded text-gray-600 text-xs font-bold">H2</button>
                  <button type="button" className="p-1.5 hover:bg-gray-100 rounded text-gray-600 text-xs font-bold">H3</button>
                  <div className="w-px h-6 bg-gray-200 mx-1" />
                  <button type="button" className="p-1.5 hover:bg-gray-100 rounded text-gray-600">•</button>
                  <button type="button" className="p-1.5 hover:bg-gray-100 rounded text-gray-600 text-xs">1.</button>
                  <div className="w-px h-6 bg-gray-200 mx-1" />
                  <button type="button" className="p-1.5 hover:bg-gray-100 rounded text-gray-600">🔗</button>
                  <button type="button" className="p-1.5 hover:bg-gray-100 rounded text-gray-600">🔗<span className="text-[10px] absolute mt-2 ml-1">✕</span></button>
                  <div className="w-px h-6 bg-gray-200 mx-1" />
                  <button type="button" className="p-1.5 hover:bg-gray-100 rounded text-gray-600 text-xs font-medium">Clear</button>
                </div>
              )}

              <textarea
                ref={bodyRef}
                name="body"
                className={`block w-full border border-brand-border px-4 py-4 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue min-h-[200px] transition-all ${format === 'HTML' ? 'rounded-b-lg' : 'rounded-lg'}`}
                required
                placeholder="e.g. Dear {{FirstName}}, thank you for registering..."
                defaultValue={editingRow?.body || ''}
              ></textarea>
              <div className="text-xs text-brand-textMuted pt-1 space-y-0.5">
                <p className="font-semibold text-brand-textSecondary">Available variables:</p>
                <p>
                  <code className="bg-gray-100 px-1 rounded">{'{{FirstName}}'}</code> — recipient's first name &nbsp;
                  <code className="bg-gray-100 px-1 rounded">{'{{LastName}}'}</code> — last name &nbsp;
                  <code className="bg-gray-100 px-1 rounded">{'{{FullName}}'}</code> — full name
                </p>
                <p className="text-gray-400">Example: <em>Dear {'{{FirstName}}'}, your ballot has been received.</em></p>
              </div>
              <ListTagPicker textareaRef={bodyRef} onTagsChange={setMetaTags} />
            </div>

            <div className="flex items-center space-x-3">
              <input 
                type="checkbox" 
                name="active"
                id="active" 
                className="w-5 h-5 rounded border-brand-border text-brand-blue focus:ring-brand-blue cursor-pointer"
                defaultChecked={editingRow?.status === 'Active' || !editingRow}
              />
              <label htmlFor="active" className="text-sm font-semibold text-brand-textPrimary cursor-pointer">Active</label>
            </div>
            
            <div className="flex gap-4 pt-4">
              <button 
                type="submit" 
                className="flex-1 py-3.5 bg-brand-navy text-white rounded-lg font-bold text-sm hover:bg-opacity-90 transition-all"
                style={{ backgroundColor: '#0047AB' }}
              >
                {editingRow ? 'Update' : 'Create'}
              </button>
              <button 
                type="button" 
                onClick={handleBack} 
                className="flex-1 py-3.5 bg-gray-200 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Nadia AI lives globally in AppLayout — context registered via useEffect above */}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">Email Templates</h1>
          <p className="text-sm text-brand-textMuted mt-1">Manage email message templates</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={handleAdd} className="rounded-lg px-6 py-2.5 font-semibold">+ Add Template</Button>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={templates} 
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage={loading ? 'Loading templates...' : 'No templates found'}
      />
    </div>
  );
};

export default EmailTemplates;

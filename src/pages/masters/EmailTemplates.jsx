import { useState, useEffect, useRef } from 'react';
import { Paperclip, Trash2, Upload } from 'lucide-react';

import { emailTemplatesApi, emailTemplateAttachmentsApi } from '../../api/email';
import DataTable from '../../components/shared/DataTable';
import Button from '../../components/shared/Button';
import Badge from '../../components/shared/Badge';
import ListTagPicker from '../../components/shared/ListTagPicker';
import { useNadia } from '../../contexts/NadiaContext';

// ── Template Attachment Manager ───────────────────────────────────────────────
const TemplateAttachmentManager = ({ template, onBack }) => {
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading]     = useState(false);
  const [error, setError]             = useState('');
  const fileRef = useRef(null);

  const load = async () => {
    try {
      const data = await emailTemplateAttachmentsApi.list(template.id);
      setAttachments(Array.isArray(data) ? data : []);
    } catch { setAttachments([]); }
  };

  useEffect(() => { load(); }, [template.id]);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setError('');
    setUploading(true);
    try {
      for (const file of files) {
        await emailTemplateAttachmentsApi.upload(template.id, file);
      }
      await load();
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (attachId, name) => {
    if (!window.confirm(`Remove "${name}"?`)) return;
    try {
      await emailTemplateAttachmentsApi.remove(template.id, attachId);
      await load();
    } catch (err) { setError(err.message || 'Delete failed'); }
  };

  const fmtSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const fileIcon = (ct) => {
    if (ct?.includes('pdf'))   return '📄';
    if (ct?.includes('image')) return '🖼️';
    if (ct?.includes('word') || ct?.includes('msword')) return '📝';
    if (ct?.includes('excel') || ct?.includes('spreadsheet')) return '📊';
    return '📎';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">Template Attachments</h1>
          <p className="text-sm text-brand-textMuted mt-1">
            <span className="font-semibold text-brand-textPrimary">{template.name}</span>
            &nbsp;·&nbsp;These files are sent with <em>every job</em> that uses this template.
          </p>
        </div>
        <button onClick={onBack} className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-brand-textPrimary hover:bg-gray-50 transition-colors">
          ← Back to Templates
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-brand-border p-6 max-w-2xl">
        <div
          className="border-2 border-dashed border-brand-border rounded-lg p-8 text-center cursor-pointer hover:border-brand-blue transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="mx-auto mb-2 text-gray-400" size={32} />
          <p className="text-sm font-medium text-brand-textPrimary">Click to upload files</p>
          <p className="text-xs text-brand-textMuted mt-1">PDF, Images, Word, Excel, Text · Max 10 MB each</p>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt"
            onChange={handleUpload}
          />
        </div>

        {uploading && (
          <div className="mt-4 flex items-center gap-2 text-sm text-brand-blue">
            <span className="animate-spin inline-block w-4 h-4 border-2 border-brand-blue border-t-transparent rounded-full" />
            Uploading…
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        {attachments.length > 0 && (
          <ul className="mt-6 space-y-2">
            {attachments.map(att => (
              <li key={att.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl">{fileIcon(att.content_type)}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-brand-textPrimary truncate max-w-xs">{att.filename}</p>
                    <p className="text-xs text-brand-textMuted">{fmtSize(att.file_size)} · {att.content_type}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(att.id, att.filename)}
                  className="ml-4 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  title="Remove attachment"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {attachments.length === 0 && !uploading && (
          <p className="mt-6 text-sm text-brand-textMuted text-center">No attachments yet.</p>
        )}
      </div>
    </div>
  );
};

const EmailTemplates = () => {
  const [view, setView] = useState('list'); // 'list' or 'add'
  const [attachTemplate, setAttachTemplate] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const bodyRef    = useRef(null);
  const subjectRef = useRef(null);
  const [format, setFormat]             = useState('Plain Text');
  const [metaTags, setMetaTags]         = useState([]);
  const [nadiaFormat, setNadiaFormat]   = useState('Plain Text');
  const { setEmailContext }             = useNadia();
  const [showPreview, setShowPreview]   = useState(false);
  const [previewHtml, setPreviewHtml]   = useState('');
  const [showLinkPopup, setShowLinkPopup] = useState(false);
  const [linkText, setLinkText]           = useState('');
  const [linkUrl, setLinkUrl]             = useState('');

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await emailTemplatesApi.list();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load templates:', err);
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
        <div className="flex items-center gap-2">
          <Badge variant={row.status === 'Active' ? 'success' : 'default'}>
            {row.status}
          </Badge>
          <button
            onClick={() => setAttachTemplate(row)}
            className="p-1 rounded text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
            title="Manage default attachments"
          >
            <Paperclip size={14} />
          </button>
        </div>
      )
    }
  ];

  const handleAdd = () => {
    setEditingRow(null);
    setFormat('Plain Text');
    setView('add');
  };

  const handleEdit = (row) => {
    setEditingRow(row);
    setFormat(row.type === 'HTML' ? 'HTML' : 'Plain Text');
    setView('add');
  };

  const handleBack = () => {
    setView('list');
    setEditingRow(null);
    setFormat('Plain Text');
    setShowPreview(false);
    setPreviewHtml('');
  };

  // Update preview in real time as user types
  const handleBodyChange = (e) => {
    if (format === 'HTML') setPreviewHtml(e.target.value);
  };

  const handleInsertLink = () => {
    const text = linkText.trim();
    const url  = linkUrl.trim();
    if (!url) return;
    // Always insert a proper HTML anchor so the link is clickable in email clients
    const insertion = text
      ? `<a href="${url}">${text}</a>`
      : `<a href="${url}">${url}</a>`;
    const ta = bodyRef.current;
    if (ta) {
      const start = ta.selectionStart;
      const end   = ta.selectionEnd;
      const before = ta.value.substring(0, start);
      const after  = ta.value.substring(end);
      ta.value = before + insertion + after;
      const pos = start + insertion.length;
      ta.setSelectionRange(pos, pos);
      ta.focus();
      // Switch to HTML so the anchor tag renders correctly in email clients
      setFormat('HTML');
      setNadiaFormat('HTML');
      setPreviewHtml(ta.value);
    }
    setShowLinkPopup(false);
    setLinkText('');
    setLinkUrl('');
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

  // Attachment state (only used when editing an existing template)
  const [attachments, setAttachments]     = useState([]);
  const [attUploading, setAttUploading]   = useState(false);
  const [attError, setAttError]           = useState('');
  const attachFileRef = useRef(null);

  const loadAttachments = async (templateId) => {
    try {
      const data = await emailTemplateAttachmentsApi.list(templateId);
      setAttachments(Array.isArray(data) ? data : []);
    } catch { setAttachments([]); }
  };

  useEffect(() => {
    if (editingRow?.id) loadAttachments(editingRow.id);
    else setAttachments([]);
  }, [editingRow]);

  const handleAttachUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !editingRow?.id) return;
    setAttError('');
    setAttUploading(true);
    try {
      for (const file of files) {
        await emailTemplateAttachmentsApi.upload(editingRow.id, file);
      }
      await loadAttachments(editingRow.id);
    } catch (err) {
      setAttError(err.message || 'Upload failed');
    } finally {
      setAttUploading(false);
      if (attachFileRef.current) attachFileRef.current.value = '';
    }
  };

  const handleAttachDelete = async (attachId, name) => {
    if (!window.confirm(`Remove "${name}"?`)) return;
    try {
      await emailTemplateAttachmentsApi.remove(editingRow.id, attachId);
      await loadAttachments(editingRow.id);
    } catch (err) { setAttError(err.message || 'Delete failed'); }
  };

  const fmtSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const attFileIcon = (ct) => {
    if (ct?.includes('pdf'))   return '📄';
    if (ct?.includes('image')) return '🖼️';
    if (ct?.includes('word') || ct?.includes('msword')) return '📝';
    if (ct?.includes('excel') || ct?.includes('spreadsheet')) return '📊';
    return '📎';
  };

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
        fetchTemplates();
        handleBack();
      } else {
        // After creating, switch to edit mode so user can add attachments
        const created = await emailTemplatesApi.create(data);
        await fetchTemplates();
        setEditingRow(created);
        setFormat(created.type === 'HTML' ? 'HTML' : 'Plain Text');
        // stay in 'add' view (edit mode) — attachments section will now appear
      }
    } catch (err) {
      alert(err.message || 'Failed to save template. Please try again.');
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Are you sure you want to delete ${row.name}?`)) return;

    try {
      await emailTemplatesApi.remove(row.id);
      fetchTemplates();
    } catch (err) {
      alert(err.message || 'Failed to delete template. Please try again.');
    }
  };

  if (attachTemplate) {
    return <TemplateAttachmentManager template={attachTemplate} onBack={() => setAttachTemplate(null)} />;
  }

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
                placeholder="Email subject line — supports {{FirstName}}, {{firmname}}, etc."
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
                <div className="flex items-center gap-2">
                  {format === 'Plain Text' && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => { setShowLinkPopup(p => !p); setLinkText(''); setLinkUrl(''); }}
                        className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-md border border-blue-300 text-blue-600 hover:bg-blue-50 transition-all"
                      >
                        🔗 Insert Link
                      </button>
                      {showLinkPopup && (
                        <div className="absolute z-50 top-8 left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-72 space-y-3">
                          <p className="text-xs font-bold text-brand-textPrimary">Insert Link</p>
                          <div className="space-y-1">
                            <label className="text-[11px] text-brand-textMuted font-semibold">Display Text <span className="font-normal">(optional)</span></label>
                            <input
                              type="text"
                              value={linkText}
                              onChange={e => setLinkText(e.target.value)}
                              placeholder="e.g. Click here"
                              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-brand-blue"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] text-brand-textMuted font-semibold">URL *</label>
                            <input
                              type="url"
                              value={linkUrl}
                              onChange={e => setLinkUrl(e.target.value)}
                              placeholder="https://example.com"
                              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-brand-blue"
                            />
                          </div>
                          <p className="text-[10px] text-gray-400">Inserts a clickable blue link — switches to HTML mode automatically.</p>
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={handleInsertLink}
                              className="flex-1 py-1.5 text-xs font-bold bg-brand-blue text-white rounded-lg hover:bg-opacity-90 transition-all"
                              style={{ backgroundColor: '#0047AB' }}
                            >
                              Insert
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowLinkPopup(false)}
                              className="flex-1 py-1.5 text-xs font-bold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex rounded-md overflow-hidden border border-gray-200">
                    <button
                      type="button"
                      onClick={() => { setFormat('Plain Text'); setNadiaFormat('Plain Text'); setShowPreview(false); setShowLinkPopup(false); }}
                      className={`px-3 py-1 text-[11px] font-bold transition-all ${format === 'Plain Text' ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      Plain Text
                    </button>
                    <button
                      type="button"
                      onClick={() => { setFormat('HTML'); setNadiaFormat('HTML'); setPreviewHtml(bodyRef.current?.value || ''); setShowLinkPopup(false); }}
                      className={`px-3 py-1 text-[11px] font-bold transition-all ${format === 'HTML' ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      HTML
                    </button>
                  </div>
                  {format === 'HTML' && (
                    <button
                      type="button"
                      onClick={() => { setShowPreview(p => !p); setPreviewHtml(bodyRef.current?.value || ''); }}
                      className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-md border transition-all ${showPreview ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-700 border-emerald-400 hover:bg-emerald-50'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {showPreview ? 'Hide Preview' : 'Preview'}
                    </button>
                  )}
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
                  <button type="button" className="p-1.5 hover:bg-gray-100 rounded text-gray-600 relative">🔗<span className="text-[10px] absolute top-0 right-0">✕</span></button>
                  <div className="w-px h-6 bg-gray-200 mx-1" />
                  <button type="button" className="p-1.5 hover:bg-gray-100 rounded text-gray-600 text-xs font-medium">Clear</button>
                </div>
              )}

              <textarea
                ref={bodyRef}
                name="body"
                onChange={handleBodyChange}
                className={`block w-full border border-brand-border px-4 py-4 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue min-h-[200px] transition-all font-mono text-sm ${format === 'HTML' ? 'rounded-b-lg' : 'rounded-lg'}`}
                required
                placeholder="e.g. Dear {{FirstName}}, thank you for registering..."
                defaultValue={editingRow?.body || ''}
              ></textarea>

              {/* ── Live HTML Preview Panel ── */}
              {format === 'HTML' && showPreview && (
                <div className="mt-3 border border-emerald-300 rounded-xl overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between bg-emerald-50 border-b border-emerald-200 px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block"></span>
                      <span className="text-xs font-semibold text-emerald-700 ml-2">Live Preview</span>
                    </div>
                    <span className="text-[10px] text-emerald-500 font-medium">Updates as you type</span>
                  </div>
                  <iframe
                    title="HTML Preview"
                    srcDoc={previewHtml || '<div style="padding:32px;color:#aaa;font-family:sans-serif;text-align:center;">Start typing HTML to see a preview...</div>'}
                    className="w-full bg-white"
                    style={{ height: '520px', border: 'none' }}
                    sandbox=""
                  />
                </div>
              )}
              <div className="text-xs text-brand-textMuted pt-1 space-y-0.5">
                <p className="font-semibold text-brand-textSecondary">Available variables:</p>
                <p>
                  <code className="bg-gray-100 px-1 rounded">{'{{FirstName}}'}</code> — recipient's first name &nbsp;
                  <code className="bg-gray-100 px-1 rounded">{'{{LastName}}'}</code> — last name &nbsp;
                  <code className="bg-gray-100 px-1 rounded">{'{{FullName}}'}</code> — full name
                </p>
                <p className="text-gray-400">Example: <em>Dear {'{{FirstName}}'}, your ballot has been received.</em></p>
              </div>
              <ListTagPicker textareaRef={bodyRef} secondaryRef={subjectRef} onTagsChange={setMetaTags} />
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

            {/* ── Attachments (only when editing existing template) ── */}
            {editingRow?.id && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold text-brand-textPrimary flex items-center gap-2">
                    <Paperclip size={15} className="text-gray-500" />
                    Attachments
                    <span className="text-xs font-normal text-brand-textMuted">(sent with every email using this template)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => attachFileRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-blue border border-brand-blue rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Upload size={13} /> Attach File
                  </button>
                  <input
                    ref={attachFileRef}
                    type="file"
                    multiple
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt"
                    onChange={handleAttachUpload}
                  />
                </div>

                {attUploading && (
                  <div className="flex items-center gap-2 text-sm text-brand-blue">
                    <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-brand-blue border-t-transparent rounded-full" />
                    Uploading…
                  </div>
                )}
                {attError && <p className="text-sm text-red-500">{attError}</p>}

                {attachments.length > 0 ? (
                  <ul className="space-y-1.5">
                    {attachments.map(att => (
                      <li key={att.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 min-w-0">
                          <span>{attFileIcon(att.content_type)}</span>
                          <span className="text-sm font-medium text-brand-textPrimary truncate max-w-xs">{att.filename}</span>
                          <span className="text-xs text-brand-textMuted flex-shrink-0">{fmtSize(att.file_size)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAttachDelete(att.id, att.filename)}
                          className="ml-3 p-1 text-red-400 hover:text-red-600 rounded transition-colors flex-shrink-0"
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-brand-textMuted italic">No attachments yet. Click "Attach File" to add PDF, images, Word, Excel or text files.</p>
                )}
              </div>
            )}

            {!editingRow && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                💡 Save the template first — then you can attach files to it.
              </p>
            )}

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

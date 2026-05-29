import { useState, useEffect } from 'react';
import { Tags } from 'lucide-react';

const ListTagPicker = ({ textareaRef }) => {
  const [lists, setLists] = useState([]);
  const [selectedListId, setSelectedListId] = useState('');
  const [tags, setTags] = useState([]);

  useEffect(() => {
    fetch('/api/contact-lists')
      .then(r => r.json())
      .then(data => setLists(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedListId) { setTags([]); return; }
    fetch(`/api/contact-lists/${selectedListId}/meta-tags`)
      .then(r => r.json())
      .then(data => setTags(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [selectedListId]);

  const insertTag = (tagKey) => {
    const ta = textareaRef?.current;
    if (!ta) return;
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    const tag = `{{${tagKey}}}`;
    ta.value = ta.value.substring(0, start) + tag + ta.value.substring(end);
    ta.selectionStart = ta.selectionEnd = start + tag.length;
    ta.focus();
  };

  if (lists.length === 0) return null;

  return (
    <div className="mt-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Tags size={14} className="text-indigo-600 shrink-0" />
        <span className="text-xs font-bold text-indigo-700">Import list tags</span>
        <select
          value={selectedListId}
          onChange={e => setSelectedListId(e.target.value)}
          className="text-xs border border-indigo-200 rounded px-2 py-1 text-indigo-900 bg-white outline-none focus:border-indigo-400 cursor-pointer"
        >
          <option value="">— select a list —</option>
          {lists.map(l => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      {selectedListId && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <button
              key={tag.tag_key}
              type="button"
              onClick={() => insertTag(tag.tag_key)}
              title={`Insert {{${tag.tag_key}}} at cursor`}
              className="px-2 py-0.5 bg-white text-indigo-700 text-xs font-mono rounded border border-indigo-200 hover:bg-indigo-100 transition-colors"
            >
              {`{{${tag.tag_key}}}`}
            </button>
          ))}
        </div>
      )}

      {selectedListId && tags.length === 0 && (
        <p className="text-xs text-indigo-400 italic">No tags defined for this list.</p>
      )}
    </div>
  );
};

export default ListTagPicker;

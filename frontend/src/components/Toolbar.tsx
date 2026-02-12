import { useState, useRef, useEffect } from 'react';

interface ToolbarProps {
  registerName: string;
  onNameChange: (name: string) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = ['Register', 'Mitigations', 'Analysis'];

export default function Toolbar({ registerName, onNameChange, activeTab, onTabChange }: ToolbarProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(registerName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    setDraft(registerName);
  }, [registerName]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== registerName) {
      onNameChange(trimmed);
    } else {
      setDraft(registerName);
    }
  };

  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 h-12">
      <div className="flex items-center gap-6">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(registerName); setEditing(false); } }}
            className="text-lg font-semibold border-b-2 border-blue-500 outline-none bg-transparent px-0 py-0"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-lg font-semibold hover:text-blue-600 cursor-text bg-transparent border-none p-0"
            title="Click to rename"
          >
            {registerName} <span className="text-gray-400 text-sm">&#9998;</span>
          </button>
        )}
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                activeTab === tab
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

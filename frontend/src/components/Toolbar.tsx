import { useState, useRef, useEffect } from 'react';
import type { SnapshotListItem } from '../types';

interface ToolbarProps {
  registerName: string;
  onNameChange: (name: string) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  snapshots: SnapshotListItem[];
  activeSnapshotId: string | null;
  onSaveSnapshot: () => void;
  onSelectSnapshot: (id: string | null) => void;
  onDeleteSnapshot: (id: string) => void;
}

const TABS = ['Register', 'Mitigations', 'Analysis'];

export default function Toolbar({
  registerName, onNameChange, activeTab, onTabChange,
  snapshots, activeSnapshotId, onSaveSnapshot, onSelectSnapshot, onDeleteSnapshot,
}: ToolbarProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(registerName);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    setDraft(registerName);
  }, [registerName]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== registerName) {
      onNameChange(trimmed);
    } else {
      setDraft(registerName);
    }
  };

  const activeSnapshot = activeSnapshotId
    ? snapshots.find(s => s.id === activeSnapshotId)
    : null;

  return (
    <div>
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

        <div className="flex items-center gap-2">
          <button
            onClick={onSaveSnapshot}
            disabled={!!activeSnapshotId}
            className="px-3 py-1 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Snapshot
          </button>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="px-3 py-1 text-sm rounded-md border border-gray-300 hover:bg-gray-50 flex items-center gap-1"
            >
              {activeSnapshot ? activeSnapshot.name : 'Snapshots'}
              <span className="text-xs text-gray-400 ml-1">
                {snapshots.length > 0 ? `(${snapshots.length})` : ''}
              </span>
              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                <button
                  onClick={() => { onSelectSnapshot(null); setDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                    !activeSnapshotId ? 'bg-blue-50 text-blue-700 font-medium' : ''
                  }`}
                >
                  Current (live)
                </button>
                {snapshots.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-400">No snapshots saved</div>
                )}
                {snapshots.map(s => (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between px-3 py-2 hover:bg-gray-50 ${
                      activeSnapshotId === s.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <button
                      onClick={() => { onSelectSnapshot(s.id); setDropdownOpen(false); }}
                      className="flex-1 text-left text-sm truncate"
                    >
                      <div className={`font-medium truncate ${activeSnapshotId === s.id ? 'text-blue-700' : ''}`}>
                        {s.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(s.created_at).toLocaleString()} &middot; {s.risk_count ?? 0} risks
                      </div>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteSnapshot(s.id); }}
                      className="ml-2 text-gray-300 hover:text-red-500 text-sm flex-shrink-0"
                      title="Delete snapshot"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {activeSnapshot && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-amber-50 border-b border-amber-200 text-sm text-amber-800">
          <span>
            Viewing snapshot: <strong>{activeSnapshot.name}</strong> &mdash; {new Date(activeSnapshot.created_at).toLocaleString()}
          </span>
          <button
            onClick={() => onSelectSnapshot(null)}
            className="text-amber-700 hover:text-amber-900 underline font-medium"
          >
            Return to current
          </button>
        </div>
      )}
    </div>
  );
}

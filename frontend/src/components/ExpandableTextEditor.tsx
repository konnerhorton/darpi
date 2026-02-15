import { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import type { ICellEditorParams } from 'ag-grid-community';

const ExpandableTextEditor = forwardRef((props: ICellEditorParams, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState<string>(props.value ?? '');

  useImperativeHandle(ref, () => ({
    getValue: () => value,
  }));

  useEffect(() => {
    // Auto-focus and select text on mount
    const ta = textareaRef.current;
    if (ta) {
      ta.focus();
      ta.select();
      autoResize(ta);
    }
  }, []);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    autoResize(e.target);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      props.stopEditing();
    }
    if (e.key === 'Escape') {
      props.stopEditing(true); // cancel
    }
    // Prevent AG Grid from capturing Tab while in textarea
    if (e.key === 'Tab') {
      e.preventDefault();
      props.stopEditing();
    }
  };

  return (
    <div className="expandable-editor-wrap">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="w-full resize-none border-0 outline-none bg-transparent p-[6px_10px] text-sm leading-normal"
        rows={1}
      />
    </div>
  );
});

ExpandableTextEditor.displayName = 'ExpandableTextEditor';
export default ExpandableTextEditor;

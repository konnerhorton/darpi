import { useRef, useEffect, useState } from 'react';
import type { CustomCellEditorProps } from 'ag-grid-react';

const ExpandableTextEditor = (props: CustomCellEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState<string>(props.value ?? '');

  useEffect(() => {
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
    const newValue = e.target.value;
    setValue(newValue);
    props.onValueChange(newValue);
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
};

export default ExpandableTextEditor;

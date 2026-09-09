'use client';

import { useEffect, useRef } from 'react';
import { Bold, Italic, Underline } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TOKENS = [
  { token: '{{proyecto}}', label: 'Proyecto' },
  { token: '{{remitente}}', label: 'Remitente' },
  { token: '{{mensaje}}', label: 'Mensaje' },
  { token: '{{firma}}', label: 'Firma' },
] as const;

export function PortalContactHtmlEditor({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastExternal = useRef(value);

  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.innerHTML === value) {
      lastExternal.current = value;
      return;
    }
    ref.current.innerHTML = value;
    lastExternal.current = value;
  }, [value]);

  function emit() {
    if (!ref.current) return;
    lastExternal.current = ref.current.innerHTML;
    onChange(ref.current.innerHTML);
  }

  function exec(command: string) {
    document.execCommand(command, false);
    emit();
  }

  function insertToken(token: string) {
    document.execCommand('insertText', false, token);
    emit();
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2"
          onClick={() => exec('bold')}
          disabled={disabled}
        >
          <Bold className="mr-1 h-3.5 w-3.5" />
          Negrita
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2"
          onClick={() => exec('italic')}
          disabled={disabled}
        >
          <Italic className="mr-1 h-3.5 w-3.5" />
          Cursiva
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2"
          onClick={() => exec('underline')}
          disabled={disabled}
        >
          <Underline className="mr-1 h-3.5 w-3.5" />
          Subrayado
        </Button>
        {TOKENS.map((item) => (
          <Button
            key={item.token}
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-slate-600"
            onClick={() => insertToken(item.token)}
            disabled={disabled}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label="Formato del correo"
        contentEditable={!disabled}
        suppressContentEditableWarning
        className="min-h-[10rem] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/40"
        onInput={emit}
      />
    </div>
  );
}

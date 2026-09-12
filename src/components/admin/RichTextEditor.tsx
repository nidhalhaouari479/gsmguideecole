"use client";

import { useEffect, useRef } from 'react';

type RichTextEditorProps = {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
};

const toolbar = [
    { command: 'bold', label: 'B', className: 'font-black' },
    { command: 'italic', label: 'I', className: 'italic' },
    { command: 'underline', label: 'U', className: 'underline' },
    { command: 'insertUnorderedList', label: '• Liste' },
    { command: 'insertOrderedList', label: '1. Liste' },
    { command: 'formatBlock', value: 'h2', label: 'Titre' },
    { command: 'formatBlock', value: 'blockquote', label: 'Citation' },
];

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value;
    }, [value]);

    const updateValue = () => onChange(editorRef.current?.innerHTML || '');

    const execute = (command: string, commandValue?: string) => {
        editorRef.current?.focus();
        document.execCommand(command, false, commandValue);
        updateValue();
    };

    const insertLink = () => {
        const url = window.prompt('Adresse du lien (https://...)');
        if (url?.trim()) execute('createLink', url.trim());
    };

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-brand-green/50">
            <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2">
                {toolbar.map(({ command, value: commandValue, label, className }) => (
                    <button key={label} type="button" onClick={() => execute(command, commandValue)} className={`rounded-md px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-200 ${className || ''}`}>
                        {label}
                    </button>
                ))}
                <button type="button" onClick={insertLink} className="rounded-md px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-200">Lien</button>
                <button type="button" onClick={() => execute('removeFormat')} className="rounded-md px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-200">Effacer format</button>
            </div>
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                dir="auto"
                data-placeholder={placeholder}
                onInput={updateValue}
                className="min-h-52 p-4 text-start text-sm leading-relaxed text-slate-900 outline-none empty:before:pointer-events-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)] [&_a]:text-brand-blue [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-brand-green [&_blockquote]:pl-3 [&_h2]:my-3 [&_h2]:text-xl [&_h2]:font-bold [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
            />
        </div>
    );
}

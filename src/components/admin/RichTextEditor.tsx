"use client";

import { useEffect, useRef } from 'react';

type RichTextEditorProps = {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
};

type ToolbarItem = {
    command: string;
    value?: string;
    label: string;
    title: string;
    className?: string;
};

const toolbarGroups: ToolbarItem[][] = [
    [
        { command: 'bold', label: 'B', title: 'Gras', className: 'font-bold' },
        { command: 'italic', label: 'I', title: 'Italique', className: 'italic' },
        { command: 'underline', label: 'U', title: 'Souligné', className: 'underline' },
    ],
    [
        { command: 'insertUnorderedList', label: '• Liste', title: 'Liste à puces' },
        { command: 'insertOrderedList', label: '1. Liste', title: 'Liste numérotée' },
    ],
    [
        { command: 'formatBlock', value: 'h2', label: 'Titre', title: 'Titre de section' },
        { command: 'formatBlock', value: 'blockquote', label: 'Citation', title: 'Citation' },
    ],
];

const buttonClassName =
    'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40';

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
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white transition-colors focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-brand-green/20">
            <div
                role="toolbar"
                aria-label="Mise en forme du texte"
                className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-white px-1.5 py-1"
            >
                {toolbarGroups.map((group, groupIndex) => (
                    <div key={groupIndex} className="flex items-center gap-0.5">
                        {groupIndex > 0 && <span aria-hidden="true" className="mx-1 h-5 w-px bg-slate-200" />}
                        {group.map(({ command, value: commandValue, label, title, className }) => (
                            <button
                                key={label}
                                type="button"
                                onClick={() => execute(command, commandValue)}
                                title={title}
                                aria-label={title}
                                className={`${buttonClassName} ${className || ''}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                ))}
                <div className="flex items-center gap-0.5">
                    <span aria-hidden="true" className="mx-1 h-5 w-px bg-slate-200" />
                    <button type="button" onClick={insertLink} title="Insérer un lien" aria-label="Insérer un lien" className={buttonClassName}>
                        Lien
                    </button>
                    <button type="button" onClick={() => execute('removeFormat')} title="Effacer la mise en forme" aria-label="Effacer la mise en forme" className={buttonClassName}>
                        Effacer format
                    </button>
                </div>
            </div>
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-multiline="true"
                aria-label={placeholder || 'Éditeur de texte'}
                dir="auto"
                data-placeholder={placeholder}
                onInput={updateValue}
                className="min-h-52 max-h-[50vh] overflow-y-auto p-4 text-start text-base md:text-sm leading-relaxed text-slate-900 outline-none break-words empty:before:pointer-events-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)] [&_a]:text-brand-blue [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:text-slate-600 [&_h2]:my-3 [&_h2]:text-lg [&_h2]:font-semibold [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
            />
        </div>
    );
}

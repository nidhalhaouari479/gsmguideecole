"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

/*
 * In-app replacement for window.alert / confirm / prompt.
 * Call notify.*, confirmDialog() or promptDialog() from any client component;
 * <FeedbackHost /> (mounted once in the root layout) renders them.
 */

type ToastTone = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: number;
    tone: ToastTone;
    title?: string;
    message: string;
}

interface DialogBase {
    title: string;
    message?: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: 'danger' | 'default';
}

export type ConfirmOptions = DialogBase;

export interface PromptOptions extends DialogBase {
    label?: string;
    placeholder?: string;
    defaultValue?: string;
    inputType?: 'text' | 'url' | 'number';
}

type DialogRequest =
    | { id: number; kind: 'confirm'; options: ConfirmOptions; resolve: (value: boolean) => void }
    | { id: number; kind: 'prompt'; options: PromptOptions; resolve: (value: string | null) => void };

let toasts: Toast[] = [];
let dialogs: DialogRequest[] = [];
let nextToastId = 1;
let nextDialogId = 1;
const listeners = new Set<() => void>();
let snapshot = { toasts, dialogs };

const emit = () => {
    snapshot = { toasts, dialogs };
    listeners.forEach(listener => listener());
};

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

const dismissToast = (id: number) => {
    toasts = toasts.filter(toast => toast.id !== id);
    emit();
};

const pushToast = (tone: ToastTone, message: string, title?: string) => {
    const id = nextToastId++;
    toasts = [...toasts.slice(-3), { id, tone, message, title }];
    emit();
    setTimeout(() => dismissToast(id), tone === 'error' ? 7000 : 4500);
};

export const notify = {
    success: (message: string, title?: string) => pushToast('success', message, title),
    error: (message: string, title?: string) => pushToast('error', message, title),
    info: (message: string, title?: string) => pushToast('info', message, title),
    warning: (message: string, title?: string) => pushToast('warning', message, title),
};

export const confirmDialog = (options: ConfirmOptions) =>
    new Promise<boolean>(resolve => {
        dialogs = [...dialogs, { id: nextDialogId++, kind: 'confirm', options, resolve }];
        emit();
    });

export const promptDialog = (options: PromptOptions) =>
    new Promise<string | null>(resolve => {
        dialogs = [...dialogs, { id: nextDialogId++, kind: 'prompt', options, resolve }];
        emit();
    });

const closeDialog = (request: DialogRequest, value: boolean | string | null) => {
    dialogs = dialogs.filter(dialog => dialog !== request);
    emit();
    if (request.kind === 'confirm') request.resolve(Boolean(value));
    else request.resolve(typeof value === 'string' ? value : null);
};

const toastStyle: Record<ToastTone, { icon: typeof Info; box: string; iconClass: string }> = {
    success: { icon: CheckCircle2, box: 'border-emerald-200', iconClass: 'text-emerald-600' },
    error: { icon: XCircle, box: 'border-rose-200', iconClass: 'text-rose-600' },
    warning: { icon: AlertTriangle, box: 'border-amber-200', iconClass: 'text-amber-600' },
    info: { icon: Info, box: 'border-slate-200', iconClass: 'text-slate-600' },
};

const btnBase = 'inline-flex h-10 cursor-pointer items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1';

function DialogView({ request }: { request: DialogRequest }) {
    const { options } = request;
    const [value, setValue] = useState(request.kind === 'prompt' ? request.options.defaultValue || '' : '');
    const confirmRef = useRef<HTMLButtonElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const danger = options.tone === 'danger';

    useEffect(() => {
        if (request.kind === 'prompt') inputRef.current?.focus();
        else confirmRef.current?.focus();
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') closeDialog(request, request.kind === 'confirm' ? false : null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [request]);

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        if (request.kind === 'confirm') closeDialog(request, true);
        else closeDialog(request, value);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="feedback-dialog-title">
            <motion.div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-[3px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => closeDialog(request, request.kind === 'confirm' ? false : null)}
            />
            <motion.form
                onSubmit={submit}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-2xl"
            >
                <div className="flex gap-4 px-5 pb-4 pt-5">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${danger ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-[#2572B0]'}`}>
                        {danger ? <AlertTriangle size={20} /> : <Info size={20} />}
                    </span>
                    <div className="min-w-0 flex-1">
                        <h2 id="feedback-dialog-title" className="text-base font-semibold text-slate-900">{options.title}</h2>
                        {options.message && <div className="mt-1.5 text-sm leading-relaxed text-slate-600">{options.message}</div>}
                        {request.kind === 'prompt' && (
                            <label className="mt-4 block">
                                {request.options.label && <span className="mb-1.5 block text-xs font-medium text-slate-700">{request.options.label}</span>}
                                <input
                                    ref={inputRef}
                                    type={request.options.inputType || 'text'}
                                    value={value}
                                    onChange={event => setValue(event.target.value)}
                                    placeholder={request.options.placeholder}
                                    className="h-10 w-full rounded-[10px] border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400/20"
                                />
                            </label>
                        )}
                    </div>
                </div>
                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3.5 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={() => closeDialog(request, request.kind === 'confirm' ? false : null)}
                        className={`${btnBase} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
                    >
                        {options.cancelLabel || 'Annuler'}
                    </button>
                    <button
                        ref={confirmRef}
                        type="submit"
                        className={`${btnBase} border border-transparent text-white ${danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#2572B0] hover:bg-[#1D5E93]'}`}
                    >
                        {options.confirmLabel || 'Confirmer'}
                    </button>
                </div>
            </motion.form>
        </div>
    );
}

export default function FeedbackHost() {
    const state = useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
    const activeDialog = state.dialogs[0];

    return (
        <>
            <AnimatePresence>
                {activeDialog && <DialogView key={activeDialog.id} request={activeDialog} />}
            </AnimatePresence>
            <div className="pointer-events-none fixed inset-x-0 top-4 z-[210] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end" aria-live="polite">
                <AnimatePresence initial={false}>
                    {state.toasts.map(toast => {
                        const style = toastStyle[toast.tone];
                        const Icon = style.icon;
                        return (
                            <motion.div
                                key={toast.id}
                                layout
                                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.96 }}
                                transition={{ duration: 0.15 }}
                                role={toast.tone === 'error' ? 'alert' : 'status'}
                                className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white px-4 py-3 text-left shadow-lg ${style.box}`}
                            >
                                <Icon size={18} className={`mt-0.5 shrink-0 ${style.iconClass}`} />
                                <div className="min-w-0 flex-1">
                                    {toast.title && <p className="text-sm font-semibold text-slate-900">{toast.title}</p>}
                                    <p className="text-sm text-slate-700">{toast.message}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => dismissToast(toast.id)}
                                    aria-label="Fermer"
                                    className="-mr-1 shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                >
                                    <X size={14} />
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </>
    );
}

"use client";

/**
 * Back-office UI kit. Every admin page builds on these primitives so that
 * headers, cards, buttons, badges, forms and dialogs look and behave the same.
 */

import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Search, X, type LucideIcon } from 'lucide-react';

export const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export function PageHeader({
    title,
    description,
    actions,
    eyebrow,
}: {
    title: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    eyebrow?: React.ReactNode;
}) {
    return (
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
                {eyebrow && <p className="mb-1 text-xs font-semibold text-slate-500">{eyebrow}</p>}
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
                {description && <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2 md:shrink-0">{actions}</div>}
        </header>
    );
}

export function Card({
    children,
    className,
    padded = true,
}: {
    children: React.ReactNode;
    className?: string;
    padded?: boolean;
}) {
    return (
        <section className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', padded && 'p-5', className)}>
            {children}
        </section>
    );
}

export function CardHeader({
    title,
    description,
    actions,
    className,
}: {
    title: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
            <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Stats                                                               */
/* ------------------------------------------------------------------ */

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

const toneText: Record<Tone, string> = {
    neutral: 'text-slate-900',
    success: 'text-emerald-700',
    warning: 'text-amber-700',
    danger: 'text-rose-600',
    info: 'text-sky-700',
    brand: 'text-slate-900',
};

export function StatCard({
    label,
    value,
    hint,
    icon: Icon,
    tone = 'neutral',
    onClick,
    active,
}: {
    label: React.ReactNode;
    value: React.ReactNode;
    hint?: React.ReactNode;
    icon?: LucideIcon;
    tone?: Tone;
    onClick?: () => void;
    active?: boolean;
}) {
    const body = (
        <>
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-500">{label}</p>
                {Icon && (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        <Icon size={16} strokeWidth={2} />
                    </span>
                )}
            </div>
            <p className={cn('mt-2 text-2xl font-bold tracking-tight tabular-nums', toneText[tone])}>{value}</p>
            {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </>
    );

    const base = cn(
        'rounded-xl border bg-white p-5 text-left shadow-sm',
        active ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'
    );

    if (onClick) {
        return (
            <button
                type="button"
                onClick={onClick}
                aria-pressed={active}
                className={cn(base, 'w-full transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40')}
            >
                {body}
            </button>
        );
    }
    return <div className={base}>{body}</div>;
}

/* ------------------------------------------------------------------ */
/* Badges & progress                                                   */
/* ------------------------------------------------------------------ */

const badgeTone: Record<Tone, { box: string; dot: string }> = {
    neutral: { box: 'bg-slate-50 text-slate-700 ring-slate-200', dot: 'bg-slate-400' },
    success: { box: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
    warning: { box: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
    danger: { box: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
    info: { box: 'bg-sky-50 text-sky-700 ring-sky-200', dot: 'bg-sky-500' },
    brand: { box: 'bg-lime-50 text-lime-800 ring-lime-200', dot: 'bg-brand-green' },
};

export function Badge({
    tone = 'neutral',
    dot = true,
    children,
    className,
}: {
    tone?: Tone;
    dot?: boolean;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                badgeTone[tone].box,
                className
            )}
        >
            {dot && <span className={cn('h-1.5 w-1.5 rounded-full', badgeTone[tone].dot)} aria-hidden="true" />}
            {children}
        </span>
    );
}

/** Maps enrollment / payment statuses to a badge. */
export function StatusBadge({ status }: { status?: string | null }) {
    switch (status) {
        case 'approved':
        case 'paid':
        case 'validated':
            return <Badge tone="success">Validé</Badge>;
        case 'rejected':
        case 'refused':
            return <Badge tone="danger">Refusé</Badge>;
        case 'pending':
            return <Badge tone="warning">En attente</Badge>;
        default:
            return <Badge>{status || '—'}</Badge>;
    }
}

export function ProgressBar({
    value,
    max,
    className,
    label,
}: {
    value: number;
    max: number;
    className?: string;
    label?: string;
}) {
    const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
    const complete = max > 0 && value >= max;
    return (
        <div
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={value}
            className={cn('h-1.5 w-full overflow-hidden rounded-full bg-slate-100', className)}
        >
            <div
                className={cn('h-full rounded-full transition-[width] duration-300', complete ? 'bg-emerald-500' : 'bg-amber-400')}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}

export const formatDT = (value: number | string | null | undefined) =>
    `${Number(value || 0).toLocaleString('fr-FR')} DT`;

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md';

const buttonVariant: Record<ButtonVariant, string> = {
    primary: 'bg-brand-green text-black hover:bg-[#93a937] border border-transparent',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900',
    ghost: 'bg-transparent text-slate-600 border border-transparent hover:bg-slate-100 hover:text-slate-900',
    danger: 'bg-rose-600 text-[#fff] border border-transparent hover:bg-rose-700',
    success: 'bg-emerald-600 text-[#fff] border border-transparent hover:bg-emerald-700',
};

const buttonSize: Record<ButtonSize, string> = {
    sm: 'h-9 px-3 text-sm gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
};

export const buttonClass = (variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', className?: string) =>
    cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-lg font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-50',
        buttonVariant[variant],
        buttonSize[size],
        className
    );

export function Button({
    variant = 'secondary',
    size = 'md',
    icon: Icon,
    loading,
    children,
    className,
    type = 'button',
    disabled,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon?: LucideIcon;
    loading?: boolean;
}) {
    return (
        <button type={type} disabled={disabled || loading} className={buttonClass(variant, size, className)} {...props}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : Icon ? <Icon size={16} /> : null}
            {children}
        </button>
    );
}

export function IconButton({
    label,
    icon: Icon,
    variant = 'ghost',
    className,
    type = 'button',
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    label: string;
    icon: LucideIcon;
    variant?: ButtonVariant;
}) {
    return (
        <button
            type={type}
            aria-label={label}
            title={props.title ?? label}
            className={cn(buttonClass(variant, 'md'), 'w-10 px-0', className)}
            {...props}
        >
            <Icon size={16} />
        </button>
    );
}

/* ------------------------------------------------------------------ */
/* Toolbar                                                             */
/* ------------------------------------------------------------------ */

export function SearchInput({
    value,
    onChange,
    placeholder = 'Rechercher…',
    label = 'Rechercher',
    className,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    className?: string;
}) {
    return (
        <label className={cn('relative block w-full sm:w-72', className)}>
            <span className="sr-only">{label}</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
                type="search"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-green/20"
            />
        </label>
    );
}

export function FilterTabs<T extends string>({
    options,
    value,
    onChange,
    label = 'Filtrer',
}: {
    options: Array<{ value: T; label: React.ReactNode; count?: number }>;
    value: T;
    onChange: (value: T) => void;
    label?: string;
}) {
    return (
        <div role="group" aria-label={label} className="inline-flex max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {options.map((option) => {
                const active = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40',
                            active ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-900'
                        )}
                    >
                        {option.label}
                        {option.count !== undefined && (
                            <span className={cn('rounded px-1.5 text-xs tabular-nums', active ? 'bg-slate-100 text-slate-700' : 'text-slate-400')}>
                                {option.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export function Toolbar({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn('flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between', className)}>
            {children}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */

export const table = {
    wrapper: 'w-full overflow-x-auto',
    table: 'w-full border-collapse text-left text-sm',
    thead: 'sticky top-0 z-10 bg-slate-50',
    th: 'whitespace-nowrap border-b border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-500',
    tbody: 'divide-y divide-slate-100',
    tr: 'transition-colors hover:bg-slate-50/70',
    td: 'px-4 py-3 align-middle text-slate-700',
};

/* ------------------------------------------------------------------ */
/* States                                                              */
/* ------------------------------------------------------------------ */

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className,
}: {
    icon?: LucideIcon;
    title: React.ReactNode;
    description?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
            {Icon && (
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Icon size={20} />
                </span>
            )}
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

export function Skeleton({ className }: { className?: string }) {
    return <div className={cn('animate-pulse rounded-md bg-slate-100', className)} />;
}

export function LoadingState({ label = 'Chargement…' }: { label?: string }) {
    return (
        <div className="flex items-center justify-center gap-2 py-14 text-sm text-slate-500" role="status">
            <Loader2 size={16} className="animate-spin" />
            {label}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Forms                                                               */
/* ------------------------------------------------------------------ */

const fieldBase =
    'w-full rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-green/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

export const inputClass = cn(fieldBase, 'h-10 px-3');
export const selectClass = cn(fieldBase, 'h-10 px-3 pr-8');
export const textareaClass = cn(fieldBase, 'min-h-24 px-3 py-2');

export function Field({
    label,
    htmlFor,
    hint,
    error,
    required,
    children,
    className,
}: {
    label: React.ReactNode;
    htmlFor?: string;
    hint?: React.ReactNode;
    error?: React.ReactNode;
    required?: boolean;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('space-y-1.5', className)}>
            <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
                {label}
                {required && <span className="ml-0.5 text-rose-600" aria-hidden="true">*</span>}
            </label>
            {children}
            {error ? (
                <p className="text-xs text-rose-600" role="alert">{error}</p>
            ) : hint ? (
                <p className="text-xs text-slate-500">{hint}</p>
            ) : null}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Dialog                                                              */
/* ------------------------------------------------------------------ */

const modalSize = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
};

/**
 * Centered dialog on desktop, bottom sheet on mobile (see .admin-dashboard rules in globals.css).
 * Header and footer stay fixed; only the body scrolls.
 */
export function Modal({
    open,
    onClose,
    title,
    description,
    children,
    footer,
    size = 'md',
    headerActions,
}: {
    open: boolean;
    onClose: () => void;
    title: React.ReactNode;
    description?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: keyof typeof modalSize;
    headerActions?: React.ReactNode;
}) {
    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
                    <motion.div
                        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.15 }}
                        className={cn('relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl', modalSize[size])}
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                            <div className="min-w-0">
                                <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                                {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                {headerActions}
                                <IconButton label="Fermer" icon={X} onClick={onClose} className="-mr-2" />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar">{children}</div>
                        {footer && (
                            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-end">
                                {footer}
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

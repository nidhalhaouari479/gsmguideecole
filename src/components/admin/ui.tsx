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
                {eyebrow && <p className="mb-1 text-xs font-medium text-slate-500">{eyebrow}</p>}
                <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-slate-900 sm:text-[26px]">{title}</h1>
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
        <section className={cn('rounded-2xl border border-slate-200/80 bg-white shadow-[var(--shadow-card)]', padded && 'p-5', className)}>
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
                <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">{title}</h2>
                {description && <p className="mt-0.5 text-[13px] text-slate-500">{description}</p>}
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

const toneTile: Record<Tone, string> = {
    neutral: 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200/70',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-rose-50 text-rose-700',
    info: 'bg-sky-50 text-sky-700',
    brand: 'bg-brand-soft text-brand-blue',
};

export function StatCard({
    label,
    value,
    hint,
    icon: Icon,
    tone = 'neutral',
    iconTone,
    onClick,
    active,
}: {
    label: React.ReactNode;
    value: React.ReactNode;
    hint?: React.ReactNode;
    icon?: LucideIcon;
    tone?: Tone;
    /** Colour of the icon tile; defaults to the value tone (brand blue when neutral). */
    iconTone?: Tone;
    onClick?: () => void;
    active?: boolean;
}) {
    const body = (
        <>
            <div className="flex items-start justify-between gap-3">
                <p className="pt-0.5 text-[13px] font-medium text-slate-500">{label}</p>
                {Icon && (
                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', toneTile[iconTone ?? (tone === 'neutral' ? 'brand' : tone)])}>
                        <Icon size={18} strokeWidth={2} />
                    </span>
                )}
            </div>
            <p className={cn('mt-2.5 text-2xl font-semibold leading-none tracking-tight tabular-nums', toneText[tone])}>{value}</p>
            {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
        </>
    );

    const base = cn(
        'rounded-2xl border bg-white p-5 text-left shadow-[var(--shadow-card)]',
        active ? 'border-brand-blue ring-1 ring-brand-blue' : 'border-slate-200/80'
    );

    if (onClick) {
        return (
            <button
                type="button"
                onClick={onClick}
                aria-pressed={active}
                className={cn(base, 'w-full cursor-pointer transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-slate-300/80 hover:shadow-[var(--shadow-lift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 motion-reduce:hover:translate-y-0')}
            >
                {body}
            </button>
        );
    }
    return <div className={base}>{body}</div>;
}

/**
 * The one highlighted KPI of a dashboard: dark surface with a soft brand glow.
 * Use at most once per screen.
 */
export function HeroStat({
    label,
    value,
    hint,
    icon: Icon,
    onClick,
    footer,
    className,
}: {
    label: React.ReactNode;
    value: React.ReactNode;
    hint?: React.ReactNode;
    icon?: LucideIcon;
    onClick?: () => void;
    footer?: React.ReactNode;
    className?: string;
}) {
    const body = (
        <>
            <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-blue/40 blur-3xl" />
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-brand-green/20 blur-3xl" />
            <div className="relative flex items-start justify-between gap-3">
                <p className="text-[13px] font-medium text-[#B4C0D3]">{label}</p>
                {Icon && (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#fff] ring-1 ring-inset ring-white/15">
                        <Icon size={18} strokeWidth={2} aria-hidden="true" />
                    </span>
                )}
            </div>
            <p className="relative mt-4 text-[34px] font-semibold leading-none tracking-tight text-[#fff] tabular-nums">{value}</p>
            {hint && <p className="relative mt-2 text-xs text-[#B4C0D3]">{hint}</p>}
            {footer && <div className="relative mt-auto pt-5">{footer}</div>}
        </>
    );

    const base = cn(
        'relative flex h-full flex-col overflow-hidden rounded-2xl bg-navy-950 p-6 text-left shadow-[var(--shadow-lift)]',
        className
    );

    if (onClick) {
        return (
            <button
                type="button"
                onClick={onClick}
                className={cn(base, 'w-full cursor-pointer transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2 motion-reduce:hover:translate-y-0')}
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
    brand: { box: 'bg-brand-soft text-brand-blue-dark ring-brand-blue/20', dot: 'bg-brand-blue' },
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
                'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
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
                className={cn('h-full rounded-full transition-[width] duration-300', complete ? 'bg-emerald-500' : 'bg-brand-blue')}
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
    primary: 'bg-gradient-to-b from-[#2D7FC2] to-brand-blue text-[#fff] border border-brand-blue-dark/40 shadow-[var(--shadow-brand),inset_0_1px_0_rgba(255,255,255,0.18)] hover:from-brand-blue hover:to-brand-blue-dark',
    secondary: 'bg-white text-slate-700 border border-slate-200 shadow-[var(--shadow-card)] hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900',
    ghost: 'bg-transparent text-slate-600 border border-transparent hover:bg-slate-100 hover:text-slate-900',
    danger: 'bg-white text-rose-600 border border-rose-200 shadow-[var(--shadow-card)] hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700',
    success: 'bg-emerald-600 text-[#fff] border border-transparent hover:bg-emerald-700',
};

const buttonSize: Record<ButtonSize, string> = {
    sm: 'h-8 px-3 text-[13px] gap-1.5',
    md: 'h-9 px-3.5 text-[13.5px] gap-2',
};

export const buttonClass = (variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', className?: string) =>
    cn(
        'inline-flex cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-lg font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-150 active:scale-[0.97] motion-reduce:active:scale-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
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
            className={cn(buttonClass(variant, 'md'), 'w-9 px-0', className)}
            {...props}
        >
            <Icon size={16} aria-hidden="true" />
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
                className="h-[38px] w-full rounded-[10px] border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-[var(--shadow-card)] transition-[border-color,box-shadow] duration-150 hover:border-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-focus/20"
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
        <div role="group" aria-label={label} className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-xl border border-slate-200/80 bg-[#EEF1F5] p-1">
            {options.map((option) => {
                const active = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            'inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50',
                            active ? 'bg-white font-semibold text-slate-900 shadow-[var(--shadow-card)] ring-1 ring-slate-200/70' : 'text-slate-500 hover:text-slate-900'
                        )}
                    >
                        {option.label}
                        {option.count !== undefined && (
                            <span className={cn('rounded px-1.5 text-xs tabular-nums', active ? 'bg-brand-soft text-brand-blue' : 'text-slate-400')}>
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
        <div className={cn('flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row md:px-5 sm:items-center sm:justify-between', className)}>
            {children}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */

export const table = {
    wrapper: 'w-full overflow-x-auto',
    table: 'w-full border-collapse text-left text-[13px]',
    thead: 'sticky top-0 z-10 bg-slate-50/95 backdrop-blur',
    th: 'whitespace-nowrap border-b border-slate-200/80 px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.02em] text-slate-500 first:pl-5 last:pr-5',
    tbody: 'divide-y divide-slate-100',
    tr: 'transition-colors duration-150 hover:bg-slate-50/80',
    td: 'px-4 py-3 align-middle text-[13px] text-slate-700 first:pl-5 last:pr-5',
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
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <Icon size={18} aria-hidden="true" />
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
        <div className="space-y-3 p-5" role="status" aria-live="polite">
            <span className="sr-only">{label}</span>
            {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-3" aria-hidden="true">
                    <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-slate-100" />
                    <div className="flex-1 space-y-2">
                        <div className={cn('h-3 animate-pulse rounded bg-slate-100', i % 2 ? 'w-1/2' : 'w-2/3')} />
                        <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100/70" />
                    </div>
                    <div className="hidden h-6 w-20 animate-pulse rounded-full bg-slate-100 sm:block" />
                </div>
            ))}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Forms                                                               */
/* ------------------------------------------------------------------ */

const fieldBase =
    'w-full rounded-[10px] border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 shadow-[var(--shadow-card)] transition-[border-color,box-shadow] duration-150 hover:border-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-focus/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

export const inputClass = cn(fieldBase, 'h-[38px] px-3');
export const selectClass = cn(fieldBase, 'h-[38px] px-3 pr-8');
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
            <label htmlFor={htmlFor} className="block text-[12.5px] font-medium text-slate-700">
                {label}
                {required && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
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
                        className="absolute inset-0 bg-slate-900/30 backdrop-blur-[3px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className={cn('relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[var(--shadow-pop)]', modalSize[size])}
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
                            <div className="min-w-0">
                                <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">{title}</h2>
                                {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                {headerActions}
                                <IconButton label="Fermer" icon={X} onClick={onClose} className="-mr-2" />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">{children}</div>
                        {footer && (
                            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-end">
                                {footer}
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

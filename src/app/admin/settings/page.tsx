"use client";

import React, { useState } from 'react';
import {
    Shield,
    CreditCard,
    Save,
    Building,
    Mail,
    Phone,
    MapPin,
    Lock,
    Eye,
    EyeOff,
    CheckCircle,
    AlertTriangle,
    Fingerprint,
    Server,
    Landmark,
    KeyRound
} from 'lucide-react';
import { Button, Card, CardHeader, Field, PageHeader, cn, inputClass } from '@/components/admin/ui';

const iconInputClassName = `${inputClass} pl-9`;

function IconInput({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
    return (
        <div className="relative">
            <Icon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            {children}
        </div>
    );
}

export default function SettingsAdminPage() {
    const [activeTab, setActiveTab] = useState<'general' | 'payments' | 'security'>('general');
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showPasswords, setShowPasswords] = useState(false);

    const handleSave = () => {
        setSaving(true);
        // Simulate save
        setTimeout(() => {
            setSaving(false);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        }, 1500);
    };

    const tabs = [
        { id: 'general', label: 'Système général', description: 'Identité et coordonnées', icon: Server },
        { id: 'payments', label: 'Paramètres financiers', description: 'Virements et montants', icon: CreditCard },
        { id: 'security', label: 'Contrôle des accès', description: 'Mot de passe et accès', icon: Fingerprint },
    ];

    const systemStatus = [
        { label: 'Réseau', value: 'Optimisé' },
        { label: 'Base de données', value: 'Connecté' },
        { label: 'Chiffrement', value: 'AES-256' },
    ];

    return (
        <div className="mx-auto max-w-6xl space-y-6 pb-6 md:pb-12">
            <PageHeader
                title="Paramètres du système"
                description="Variables générales de l’académie et directives de sécurité."
                actions={
                    <Button
                        variant={success ? 'secondary' : 'primary'}
                        icon={success ? CheckCircle : Save}
                        loading={saving}
                        onClick={handleSave}
                        aria-live="polite"
                        className={cn('max-md:w-full', success && 'text-emerald-700')}
                    >
                        {saving ? 'Enregistrement…' : success ? 'Données enregistrées' : 'Enregistrer'}
                    </Button>
                }
            />

            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                {/* Section navigation */}
                <aside className="space-y-4 lg:sticky lg:top-4 lg:w-64 lg:shrink-0">
                    <nav
                        aria-label="Sections des paramètres"
                        className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-col lg:overflow-visible"
                    >
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id as any)}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={cn(
                                        'flex min-h-10 shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 lg:w-full',
                                        isActive
                                            ? 'bg-white font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200'
                                            : 'font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                    )}
                                >
                                    <Icon size={16} className={isActive ? 'text-slate-700' : 'text-slate-400'} />
                                    <span className="min-w-0">
                                        <span className="block whitespace-nowrap">{tab.label}</span>
                                        <span className="hidden text-xs font-normal text-slate-500 lg:block">{tab.description}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </nav>

                    <Card className="hidden lg:block">
                        <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" /> État du système
                        </p>
                        <dl className="mt-3 space-y-2">
                            {systemStatus.map((item) => (
                                <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                                    <dt className="text-slate-500">{item.label}</dt>
                                    <dd className="font-medium text-slate-900">{item.value}</dd>
                                </div>
                            ))}
                        </dl>
                    </Card>
                </aside>

                {/* Content */}
                <div className="min-w-0 flex-1">
                    {activeTab === 'general' && (
                        <Card padded={false}>
                            <CardHeader
                                title="Identité de l’académie"
                                description="Informations publiques de l’établissement."
                                className="border-b border-slate-200 p-5"
                            />
                            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                                <Field label="Nom de l’établissement" htmlFor="settings-name">
                                    <IconInput icon={Building}>
                                        <input id="settings-name" type="text" defaultValue="GSM Guide Academy" className={iconInputClassName} />
                                    </IconInput>
                                </Field>
                                <Field label="Adresse e-mail principale" htmlFor="settings-email" hint="Adresse utilisée pour les communications officielles.">
                                    <IconInput icon={Mail}>
                                        <input id="settings-email" type="email" defaultValue="Gsmguideacademy@gmail.com" className={iconInputClassName} />
                                    </IconInput>
                                </Field>
                                <Field label="Numéro de téléphone" htmlFor="settings-phone">
                                    <IconInput icon={Phone}>
                                        <input id="settings-phone" type="tel" defaultValue="+216 71 000 000" className={`${iconInputClassName} tabular-nums`} />
                                    </IconInput>
                                </Field>
                                <Field label="Adresse physique" htmlFor="settings-address">
                                    <IconInput icon={MapPin}>
                                        <input id="settings-address" type="text" defaultValue="Tunis, Tunisie" className={iconInputClassName} />
                                    </IconInput>
                                </Field>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'payments' && (
                        <Card padded={false}>
                            <CardHeader
                                title="Coordonnées financières"
                                description="Paramètres utilisés pour les virements."
                                className="border-b border-slate-200 p-5"
                            />
                            <div className="space-y-5 p-5">
                                <div role="note" className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-amber-800">
                                    <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={16} />
                                    <div>
                                        <p className="text-sm font-semibold">Paramètre sensible</p>
                                        <p className="mt-0.5 text-sm">
                                            Vérifiez attentivement les coordonnées bancaires. Une configuration incorrecte entraînera des échecs de transaction.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid max-w-2xl grid-cols-1 gap-4">
                                    <Field label="Établissement bancaire" htmlFor="settings-bank">
                                        <IconInput icon={Landmark}>
                                            <input id="settings-bank" type="text" defaultValue="BIAT Tunisie" className={iconInputClassName} />
                                        </IconInput>
                                    </Field>
                                    <Field label="Numéro de compte (RIB)" htmlFor="settings-rib" hint="20 chiffres, tel qu’il figure sur votre relevé d’identité bancaire.">
                                        <input
                                            id="settings-rib"
                                            type="text"
                                            inputMode="numeric"
                                            defaultValue="08 000 00000000000 00"
                                            className={`${inputClass} font-mono tabular-nums`}
                                        />
                                    </Field>
                                    <Field label="Montant minimal autorisé" htmlFor="settings-min-amount" hint="Montant minimum accepté pour un versement.">
                                        <div className="relative w-full sm:w-56">
                                            <input
                                                id="settings-min-amount"
                                                type="number"
                                                defaultValue="200"
                                                className={`${inputClass} pr-12 tabular-nums`}
                                            />
                                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">DT</span>
                                        </div>
                                    </Field>
                                </div>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'security' && (
                        <Card padded={false} className="overflow-hidden">
                            <CardHeader
                                title="Paramètres de sécurité"
                                description="Gérer les identifiants d’accès principaux."
                                className="border-b border-slate-200 p-5"
                            />
                            <div className="max-w-lg space-y-4 p-5">
                                <Field label="Mot de passe actuel" htmlFor="settings-current-password">
                                    <div className="relative">
                                        <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            id="settings-current-password"
                                            type={showPasswords ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            placeholder="••••••••••••"
                                            className={`${iconInputClassName} pr-11`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords((value) => !value)}
                                            aria-label={showPasswords ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}
                                            title={showPasswords ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}
                                            className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40"
                                        >
                                            {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </Field>
                                <Field label="Nouveau mot de passe" htmlFor="settings-new-password">
                                    <IconInput icon={Shield}>
                                        <input
                                            id="settings-new-password"
                                            type={showPasswords ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            placeholder="12 caractères minimum"
                                            aria-describedby="settings-new-password-help"
                                            className={iconInputClassName}
                                        />
                                    </IconInput>
                                    <p id="settings-new-password-help" className="text-xs text-slate-500">Utilisez au moins 12 caractères, avec chiffres et symboles.</p>
                                </Field>
                            </div>
                            <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <Button variant="secondary" icon={KeyRound}>
                                    Mettre à jour le mot de passe
                                </Button>
                                <Button variant="ghost" icon={Shield} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                                    Révoquer les accès
                                </Button>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

import React, { useState } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { BuilderNavbar } from './BuilderNavbar';
import { Search, ExternalLink, Settings2, Plus, MessageCircle } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';

interface ConnectAppsPageProps {
    onNavigate: (page: string) => void;
    surveyId?: string;
}

interface AppInfo {
    id: string;
    name: string;
    description: string;
    icon: string;       // emoji for MVP
    color: string;      // bg-color class
    connected?: boolean;
}

const apps: AppInfo[] = [
    { id: 'google-sheets', name: 'Google Sheets', description: 'Sync responses to a spreadsheet in real-time', icon: '📊', color: 'bg-green-100' },
    { id: 'excel', name: 'Microsoft Excel', description: 'Export responses directly to Excel Online', icon: '📗', color: 'bg-green-100' },
    { id: 'teams', name: 'Microsoft Teams', description: 'Get notified on new responses in a channel', icon: '💬', color: 'bg-purple-100' },
    { id: 'slack', name: 'Slack', description: 'Post new responses to a Slack channel', icon: '💬', color: 'bg-purple-100' },
    { id: 'mailchimp', name: 'Mailchimp', description: 'Add respondents to your email lists', icon: '📧', color: 'bg-yellow-100' },
    { id: 'zapier', name: 'Zapier', description: 'Connect to 5,000+ apps via Zapier workflows', icon: '⚡', color: 'bg-orange-100' },
    { id: 'google-forms', name: 'Google Forms', description: 'Import questions from existing Google Forms', icon: '📋', color: 'bg-blue-100' },
    { id: 'hubspot', name: 'HubSpot', description: 'Push responses to HubSpot CRM contacts', icon: '🧡', color: 'bg-orange-100' },
    { id: 'notion', name: 'Notion', description: 'Save responses as entries in a Notion database', icon: '📝', color: 'bg-gray-100' },
    { id: 'facebook', name: 'Facebook Pages', description: 'Share surveys on your Facebook Page', icon: '👤', color: 'bg-blue-100' },
    { id: 'discord', name: 'Discord', description: 'Post response alerts to a Discord channel', icon: '🎮', color: 'bg-indigo-100' },
    { id: 'google-calendar', name: 'Google Calendar', description: 'Schedule survey reminders via Calendar', icon: '📅', color: 'bg-blue-100' },
];

export function ConnectAppsPage({ onNavigate, surveyId }: ConnectAppsPageProps) {
    usePageTitle('Connect Apps');
    const [tab, setTab] = useState<'connect' | 'manage'>('connect');
    const [searchTerm, setSearchTerm] = useState('');
    const [connectedApps, setConnectedApps] = useState<string[]>([]);

    const filtered = apps.filter((app) =>
        app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const displayApps = tab === 'connect'
        ? filtered.filter((a) => !connectedApps.includes(a.id))
        : filtered.filter((a) => connectedApps.includes(a.id));

    // Simulated connect/disconnect (no real backend in MVP)
    const handleConnect = (appId: string) => {
        setConnectedApps((prev) => [...prev, appId]);
    };
    const handleDisconnect = (appId: string) => {
        setConnectedApps((prev) => prev.filter((id) => id !== appId));
    };

    return (
        <div className="min-h-screen bg-background">
            <BuilderNavbar
                surveyId={surveyId}
                currentStep={3}
                onNavigate={onNavigate}
            />

            <div className="pt-16 pb-8 max-w-5xl mx-auto px-8">
                {/* Header */}
                <div className="text-center mb-8 mt-4">
                    <h2 className="text-3xl font-bold text-foreground mb-3">Connect Apps</h2>
                    <p className="text-gray-500 text-lg">
                        Integrate your survey with the tools you already use
                    </p>
                </div>

                {/* Connect / Manage Toggle */}
                <div className="flex justify-center mb-6">
                    <div className="bg-gray-100 rounded-full p-1 flex">
                        <button
                            onClick={() => setTab('connect')}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${tab === 'connect'
                                ? 'bg-white text-foreground shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Connect
                        </button>
                        <button
                            onClick={() => setTab('manage')}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${tab === 'manage'
                                ? 'bg-white text-foreground shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Manage{connectedApps.length > 0 && ` (${connectedApps.length})`}
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="max-w-md mx-auto mb-8">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search apps..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                        />
                    </div>
                </div>

                {/* Apps Grid */}
                {tab === 'connect' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                        {displayApps.map((app) => (
                            <Card key={app.id} className="p-5 hover:shadow-md transition-shadow">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className={`w-10 h-10 ${app.color} rounded-lg flex items-center justify-center text-xl`}>
                                        {app.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-foreground text-sm">{app.name}</h3>
                                        <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{app.description}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    className="w-full gap-2"
                                    onClick={() => handleConnect(app.id)}
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Connect
                                </Button>
                            </Card>
                        ))}

                        {displayApps.length === 0 && searchTerm && (
                            <div className="col-span-full text-center py-12">
                                <p className="text-gray-500 mb-2">No apps found for "{searchTerm}"</p>
                                <p className="text-gray-400 text-sm">Try a different search term</p>
                            </div>
                        )}

                        {displayApps.length === 0 && !searchTerm && (
                            <div className="col-span-full text-center py-12">
                                <p className="text-gray-500 mb-2">All available apps are connected!</p>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'manage' && (
                    <div className="space-y-3 mb-8">
                        {displayApps.length === 0 && (
                            <Card className="p-12 text-center">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Settings2 className="w-6 h-6 text-gray-400" />
                                </div>
                                <h3 className="font-semibold text-foreground mb-2">No connected apps</h3>
                                <p className="text-gray-500 text-sm mb-4">
                                    Switch to the Connect tab to add your first integration.
                                </p>
                                <Button variant="outline" size="sm" onClick={() => setTab('connect')}>
                                    Browse Apps
                                </Button>
                            </Card>
                        )}

                        {displayApps.map((app) => (
                            <Card key={app.id} className="p-4 flex items-center gap-4">
                                <div className={`w-10 h-10 ${app.color} rounded-lg flex items-center justify-center text-xl flex-shrink-0`}>
                                    {app.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-foreground text-sm">{app.name}</h3>
                                    <p className="text-gray-500 text-xs truncate">{app.description}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                        Connected
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                        onClick={() => handleDisconnect(app.id)}
                                    >
                                        Disconnect
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Request an App */}
                <Card className="p-6 bg-gradient-to-br from-gray-50 to-white">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                            <MessageCircle className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-foreground mb-1">Don't see the app you need?</h3>
                            <p className="text-gray-500 text-sm">
                                Let us know and we'll work on adding it to our integration library.
                            </p>
                        </div>
                        <Button variant="outline" className="gap-2 flex-shrink-0">
                            <ExternalLink className="w-4 h-4" />
                            Request an App
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}

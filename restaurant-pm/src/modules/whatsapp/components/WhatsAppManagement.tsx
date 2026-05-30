/**
 * WhatsApp Management
 * Pagina principal de gestion de WhatsApp (whatsapp-web.js)
 */

import React, { useState } from 'react';
import { WhatsAppConfigSection } from './WhatsAppConfigSection';
import { WhatsAppConversationsSection } from './WhatsAppConversationsSection';
import { WhatsAppStatsSection } from './WhatsAppStatsSection';
import { ChatbotConfigSection } from './ChatbotConfigSection';
import type { WhatsAppTab } from '../types';

const tabs: { id: WhatsAppTab; label: string; icon: string }[] = [
    { id: 'stats', label: 'Dashboard', icon: '📊' },
    { id: 'conversations', label: 'Conversaciones', icon: '💬' },
    { id: 'chatbot', label: 'Chatbot', icon: '🤖' },
    { id: 'config', label: 'Conexion', icon: '⚙️' },
];

export const WhatsAppManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState<WhatsAppTab>('config');

    const renderContent = () => {
        switch (activeTab) {
            case 'config':
                return <WhatsAppConfigSection />;
            case 'conversations':
                return <WhatsAppConversationsSection />;
            case 'stats':
                return <WhatsAppStatsSection />;
            case 'chatbot':
                return <ChatbotConfigSection />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-light-background dark:bg-dark-900 p-4 md:p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-light-text dark:text-white">
                            WhatsApp Chatbot
                        </h1>
                        <p className="text-sm text-gray-500">
                            Conecta WhatsApp escaneando el codigo QR
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-6">
                <div className="flex flex-wrap gap-2 bg-light-surface dark:bg-dark-800 p-1 rounded-xl border border-light-border dark:border-dark-700">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                                activeTab === tab.id
                                    ? 'bg-green-600 text-white'
                                    : 'text-gray-500 hover:text-light-text dark:hover:text-white hover:bg-light-background dark:hover:bg-dark-700'
                            }`}
                        >
                            <span>{tab.icon}</span>
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="animate-fade-in">
                {renderContent()}
            </div>
        </div>
    );
};

export default WhatsAppManagement;

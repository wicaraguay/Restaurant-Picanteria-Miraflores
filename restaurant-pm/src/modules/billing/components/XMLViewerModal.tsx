import React from 'react';
import { RefreshCcwIcon, FileTextIcon } from '../../../components/ui/Icons';

interface XMLViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    xmlContent: string;
    documentNumber?: string;
}

export const XMLViewerModal: React.FC<XMLViewerModalProps> = ({ 
    isOpen, 
    onClose, 
    xmlContent, 
    documentNumber 
}) => {
    if (!isOpen) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(xmlContent);
        alert('XML copiado al portapapeles');
    };

    // Helper to format XML for display
    const formatXML = (xml: string) => {
        if (!xml) return '';
        let formatted = '';
        let indent = '';
        xml.split(/>\s*</).forEach((node) => {
            if (node.match(/^\/\w/)) indent = indent.substring(2);
            formatted += indent + '<' + node + '>\r\n';
            if (node.match(/^<?\w[^>]*[^\/]$/) && !node.startsWith('?')) indent += '  ';
        });
        return formatted.substring(1, formatted.length - 3);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-dark-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100 dark:border-dark-700 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-700 flex items-center justify-between bg-gray-50/50 dark:bg-dark-900/50">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white"> Visor de XML Técnico</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Verificando datos para: {documentNumber || 'Factura'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleCopy}
                            className="p-2 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-white dark:hover:bg-dark-800 flex items-center gap-1"
                            title="Copiar XML"
                        >
                            <FileTextIcon className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-tighter">Copiar</span>
                        </button>
                        <button 
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors text-xl font-black"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-dark-950">
                    <pre className="text-[10px] sm:text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-dark-700">
                        {xmlContent ? formatXML(xmlContent) : 'No hay contenido XML disponible para esta factura.'}
                    </pre>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-white dark:bg-dark-800 border-t border-gray-100 dark:border-dark-700 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 font-black rounded-xl hover:bg-gray-200 dark:hover:bg-dark-600 transition-all text-[10px] uppercase tracking-widest"
                    >
                        Cerrar Visor
                    </button>
                </div>
            </div>
        </div>
    );
};

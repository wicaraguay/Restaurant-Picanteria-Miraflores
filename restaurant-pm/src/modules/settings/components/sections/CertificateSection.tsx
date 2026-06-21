import React, { useRef, useState } from 'react';
import Card from '../../../../components/ui/Card';
import ConfirmModal from '../../../../components/ui/ConfirmModal';
import { toast } from '../../../../components/ui/AlertProvider';

/** Información de secuenciales por ambiente */
interface SequentialInfo {
    factura: number;
    notaCredito: number;
    notaVenta: number;
}

/** Resultado del cambio de ambiente */
interface EnvironmentChangeResult {
    success: boolean;
    message: string;
    previousEnvironment: {
        code: '1' | '2';
        name: string;
        sequentials: SequentialInfo;
    };
    newEnvironment: {
        code: '1' | '2';
        name: string;
        sequentials: SequentialInfo;
    };
    nextInvoiceNumber: string;
    nextCreditNoteNumber: string;
}

interface CertificateSectionProps {
    certificate?: {
        environment: '1' | '2';
        uploadedAt: Date;
        validUntil?: Date;
        rucInCertificate?: string;
    };
    onUpload: (certificateBase64: string, password: string, environment: '1' | '2') => Promise<void>;
    onDelete: () => Promise<void>;
    onChangeEnvironment: (environment: '1' | '2') => Promise<EnvironmentChangeResult>;
}

const inputClass = "w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-gray-900 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all dark:border-gray-700 dark:bg-dark-800 dark:text-white dark:placeholder-gray-500";
const labelClass = "text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1";

const CertificateSection: React.FC<CertificateSectionProps> = ({ certificate, onUpload, onDelete, onChangeEnvironment }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [password, setPassword] = useState('');
    const [environment, setEnvironment] = useState<'1' | '2'>(certificate?.environment || '1');
    const [fileName, setFileName] = useState<string | null>(null);
    const [fileBase64, setFileBase64] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isChangingEnv, setIsChangingEnv] = useState(false);

    // Modal states
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEnvModal, setShowEnvModal] = useState(false);
    const [pendingEnv, setPendingEnv] = useState<'1' | '2' | null>(null);

    // Modal de resultado del cambio de ambiente
    const [showResultModal, setShowResultModal] = useState(false);
    const [envChangeResult, setEnvChangeResult] = useState<EnvironmentChangeResult | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.p12') && !file.name.endsWith('.pfx')) {
            toast.error('El archivo debe ser un certificado .p12 o .pfx', 'Formato Inválido');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB
            toast.error('El archivo es demasiado grande. Máximo 10MB.', 'Archivo muy grande');
            return;
        }

        setFileName(file.name);

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            const base64 = result.split(',')[1]; // Remover el prefijo data:...;base64,
            setFileBase64(base64);
        };
        reader.readAsDataURL(file);
    };

    const handleUpload = async () => {
        if (!fileBase64) {
            toast.error('Selecciona un archivo .p12 primero', 'Archivo Requerido');
            return;
        }

        if (!password.trim()) {
            toast.error('Ingresa la contraseña del certificado', 'Contraseña Requerida');
            return;
        }

        try {
            setIsUploading(true);
            await onUpload(fileBase64, password, environment);
            toast.success('Certificado digital subido correctamente', 'Éxito');

            // Limpiar formulario
            setFileName(null);
            setFileBase64(null);
            setPassword('');
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            toast.error('Error al subir el certificado', 'Error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteClick = () => {
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        try {
            setIsDeleting(true);
            await onDelete();
            setShowDeleteModal(false);
            toast.success('Certificado digital eliminado correctamente', 'Éxito');
        } catch (error) {
            toast.error('Error al eliminar el certificado', 'Error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEnvironmentClick = (newEnv: '1' | '2') => {
        if (newEnv === certificate?.environment) return;
        setPendingEnv(newEnv);
        setShowEnvModal(true);
    };

    const handleEnvironmentConfirm = async () => {
        if (!pendingEnv) return;

        try {
            setIsChangingEnv(true);
            const result = await onChangeEnvironment(pendingEnv);
            setShowEnvModal(false);
            setPendingEnv(null);

            // Mostrar modal con información detallada
            setEnvChangeResult(result);
            setShowResultModal(true);
        } catch (error) {
            toast.error('Error al cambiar el ambiente', 'Error');
        } finally {
            setIsChangingEnv(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Certificado Digital</h2>
                            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Firma electrónica (.p12)</p>
                        </div>
                    </div>

                    {certificate ? (
                        // Vista cuando YA existe un certificado
                        <div className="space-y-6">
                            {/* Info del certificado */}
                            <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 rounded-2xl">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-green-200 dark:bg-green-900/50 flex items-center justify-center text-green-700 dark:text-green-400 flex-shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-green-800 dark:text-green-400">Certificado Activo</h4>
                                                <div className="mt-2 space-y-1 text-[10px] font-bold text-green-700/70 dark:text-green-300/60">
                                                    <p>Subido: <span className="font-black">{new Date(certificate.uploadedAt).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
                                                    {certificate.validUntil && (
                                                        <p className={
                                                            new Date(certificate.validUntil).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000
                                                                ? 'text-red-600 dark:text-red-400 font-black'
                                                                : ''
                                                        }>
                                                            Válido hasta: <span className="font-black">
                                                                {new Date(certificate.validUntil).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                            </span>
                                                            {new Date(certificate.validUntil).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000 && (
                                                                <span className="ml-2 text-[8px] bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-1 rounded-full uppercase tracking-wider">
                                                                    ⚠️ Próximo a vencer
                                                                </span>
                                                            )}
                                                        </p>
                                                    )}
                                                    {certificate.rucInCertificate && (
                                                        <p>RUC: <span className="font-black">{certificate.rucInCertificate}</span></p>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleDeleteClick}
                                                disabled={isDeleting}
                                                className="ml-4 px-4 py-2 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-200 dark:hover:bg-red-900/50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                                {isDeleting ? 'Eliminando...' : 'Eliminar'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Selector de Ambiente SEPARADO - No requiere volver a subir el certificado */}
                            <div className="p-5 bg-blue-50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-800/30">
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-xl bg-blue-200 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-400 flex-shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-800 dark:text-blue-400">Ambiente SRI</h4>
                                        <p className="text-[10px] font-bold text-blue-700/70 dark:text-blue-300/60 uppercase tracking-widest mt-1">
                                            Cambia entre Pruebas y Producción sin volver a subir el certificado
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <label className={`flex items-center p-4 border-2 rounded-2xl transition-all cursor-pointer flex-1 ${
                                        certificate.environment === '1'
                                            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-400 dark:border-amber-600'
                                            : 'bg-gray-50/50 dark:bg-dark-900 border-gray-200 dark:border-dark-700/50 hover:bg-white dark:hover:bg-dark-800 hover:border-blue-500/30'
                                    }`}>
                                        <input
                                            type="radio"
                                            name="current-environment"
                                            value="1"
                                            checked={certificate.environment === '1'}
                                            onChange={() => handleEnvironmentClick('1')}
                                            disabled={isChangingEnv}
                                            className="h-5 w-5 text-amber-600 rounded-full border-gray-300 focus:ring-amber-500 transition-all cursor-pointer"
                                        />
                                        <div className="ml-3">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 block">
                                                Pruebas (Testing)
                                                {certificate.environment === '1' && <span className="ml-2 text-amber-600">✓ Activo</span>}
                                            </span>
                                            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Para probar facturación</span>
                                        </div>
                                    </label>

                                    <label className={`flex items-center p-4 border-2 rounded-2xl transition-all cursor-pointer flex-1 ${
                                        certificate.environment === '2'
                                            ? 'bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-600'
                                            : 'bg-gray-50/50 dark:bg-dark-900 border-gray-200 dark:border-dark-700/50 hover:bg-white dark:hover:bg-dark-800 hover:border-blue-500/30'
                                    }`}>
                                        <input
                                            type="radio"
                                            name="current-environment"
                                            value="2"
                                            checked={certificate.environment === '2'}
                                            onChange={() => handleEnvironmentClick('2')}
                                            disabled={isChangingEnv}
                                            className="h-5 w-5 text-green-600 rounded-full border-gray-300 focus:ring-green-500 transition-all cursor-pointer"
                                        />
                                        <div className="ml-3">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 block">
                                                Producción (Live)
                                                {certificate.environment === '2' && <span className="ml-2 text-green-600">✓ Activo</span>}
                                            </span>
                                            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Facturas reales al SRI</span>
                                        </div>
                                    </label>
                                </div>
                                {isChangingEnv && (
                                    <p className="mt-3 text-[10px] font-black text-blue-600 dark:text-blue-400 text-center uppercase tracking-widest">
                                        Cambiando ambiente...
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        // Vista cuando NO hay certificado - Formulario de subida
                        <div className="space-y-6">
                            <div className="p-5 bg-amber-50 dark:bg-amber-900/10 rounded-3xl border border-amber-100 dark:border-amber-800/30">
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-xl bg-amber-200 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-400 flex-shrink-0">
                                        <span className="text-sm font-black">!</span>
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-400">Importante</h4>
                                        <p className="text-[10px] font-bold text-amber-700/70 dark:text-amber-300/60 uppercase tracking-widest mt-1 leading-relaxed">
                                            El certificado debe coincidir con tu RUC. Si cambias el RUC, necesitas un nuevo certificado.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className={labelClass}>Archivo de Certificado (.p12)</label>
                                    <div className="flex items-center gap-3 mt-2">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".p12,.pfx"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-6 py-3 rounded-xl bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition-all shadow-sm active:scale-95"
                                        >
                                            Seleccionar Archivo
                                        </button>
                                        {fileName && (
                                            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800/30">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                                </svg>
                                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{fileName}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="cert-password" className={labelClass}>Contraseña del Certificado</label>
                                    <input
                                        type="password"
                                        id="cert-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Ingresa la contraseña de tu certificado .p12"
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>Ambiente SRI</label>
                                    <div className="mt-2 flex gap-4">
                                        <label className="flex items-center p-4 border rounded-2xl bg-gray-50/50 dark:bg-dark-900 dark:border-dark-700/50 hover:bg-white dark:hover:bg-dark-800 hover:border-blue-500/30 transition-all cursor-pointer flex-1">
                                            <input
                                                type="radio"
                                                name="environment"
                                                value="1"
                                                checked={environment === '1'}
                                                onChange={(e) => setEnvironment(e.target.value as '1')}
                                                className="h-5 w-5 text-blue-600 rounded-full border-gray-300 focus:ring-blue-500 transition-all cursor-pointer"
                                            />
                                            <div className="ml-3">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 block">Pruebas (Testing)</span>
                                                <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Para probar facturación</span>
                                            </div>
                                        </label>

                                        <label className="flex items-center p-4 border rounded-2xl bg-gray-50/50 dark:bg-dark-900 dark:border-dark-700/50 hover:bg-white dark:hover:bg-dark-800 hover:border-blue-500/30 transition-all cursor-pointer flex-1">
                                            <input
                                                type="radio"
                                                name="environment"
                                                value="2"
                                                checked={environment === '2'}
                                                onChange={(e) => setEnvironment(e.target.value as '2')}
                                                className="h-5 w-5 text-blue-600 rounded-full border-gray-300 focus:ring-blue-500 transition-all cursor-pointer"
                                            />
                                            <div className="ml-3">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 block">Producción (Live)</span>
                                                <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Facturas reales al SRI</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button
                                    type="button"
                                    onClick={handleUpload}
                                    disabled={!fileBase64 || !password.trim() || isUploading}
                                    className="bg-amber-600 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-700 transition-all shadow-xl shadow-amber-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUploading ? 'Subiendo...' : 'Subir Certificado'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Modal de confirmación para eliminar certificado */}
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteConfirm}
                title="Eliminar Certificado"
                message="¿Estás seguro de eliminar el certificado digital? Deberás subir uno nuevo para poder generar facturas electrónicas."
                confirmText="Eliminar"
                cancelText="Cancelar"
                type="danger"
                showLoading={isDeleting}
            />

            {/* Modal de confirmación para cambiar ambiente */}
            <ConfirmModal
                isOpen={showEnvModal}
                onClose={() => {
                    setShowEnvModal(false);
                    setPendingEnv(null);
                }}
                onConfirm={handleEnvironmentConfirm}
                title="Cambiar Ambiente"
                message={`¿Cambiar el ambiente a ${pendingEnv === '1' ? 'Pruebas' : 'Producción'}? Las nuevas facturas se enviarán al SRI de ${pendingEnv === '1' ? 'Pruebas' : 'Producción'}.`}
                confirmText="Cambiar"
                cancelText="Cancelar"
                type="warning"
                showLoading={isChangingEnv}
            />

            {/* Modal informativo con resultado del cambio de ambiente */}
            {showResultModal && envChangeResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-dark-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-6">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                envChangeResult.newEnvironment.code === '2'
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                            }`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                    Ambiente Cambiado
                                </h3>
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                    {envChangeResult.previousEnvironment.name} → {envChangeResult.newEnvironment.name}
                                </p>
                            </div>
                        </div>

                        {/* Info de secuenciales */}
                        <div className="space-y-4">
                            {/* Ambiente anterior */}
                            <div className="p-4 bg-gray-50 dark:bg-dark-700/50 rounded-2xl">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                                    Secuenciales {envChangeResult.previousEnvironment.name} (anterior)
                                </h4>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Facturas:</span>
                                        <span className="ml-2 font-black text-gray-700 dark:text-gray-200">
                                            {envChangeResult.previousEnvironment.sequentials.factura}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Notas Crédito:</span>
                                        <span className="ml-2 font-black text-gray-700 dark:text-gray-200">
                                            {envChangeResult.previousEnvironment.sequentials.notaCredito}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Ambiente nuevo */}
                            <div className={`p-4 rounded-2xl ${
                                envChangeResult.newEnvironment.code === '2'
                                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30'
                                    : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30'
                            }`}>
                                <h4 className={`text-[10px] font-black uppercase tracking-widest mb-3 ${
                                    envChangeResult.newEnvironment.code === '2'
                                        ? 'text-green-700 dark:text-green-400'
                                        : 'text-amber-700 dark:text-amber-400'
                                }`}>
                                    Secuenciales {envChangeResult.newEnvironment.name} (activo)
                                </h4>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <span className="text-gray-600 dark:text-gray-300">Facturas:</span>
                                        <span className="ml-2 font-black text-gray-800 dark:text-gray-100">
                                            {envChangeResult.newEnvironment.sequentials.factura}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600 dark:text-gray-300">Notas Crédito:</span>
                                        <span className="ml-2 font-black text-gray-800 dark:text-gray-100">
                                            {envChangeResult.newEnvironment.sequentials.notaCredito}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Próximos documentos */}
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800/30">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-400 mb-3">
                                    Próximos Documentos a Emitir
                                </h4>
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between items-center">
                                        <span className="text-blue-600 dark:text-blue-300">Próxima Factura:</span>
                                        <span className="font-black text-blue-800 dark:text-blue-200 font-mono bg-blue-100 dark:bg-blue-900/40 px-3 py-1 rounded-lg">
                                            {envChangeResult.nextInvoiceNumber}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-blue-600 dark:text-blue-300">Próxima N/C:</span>
                                        <span className="font-black text-blue-800 dark:text-blue-200 font-mono bg-blue-100 dark:bg-blue-900/40 px-3 py-1 rounded-lg">
                                            {envChangeResult.nextCreditNoteNumber}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Botón cerrar */}
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => {
                                    setShowResultModal(false);
                                    setEnvChangeResult(null);
                                }}
                                className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${
                                    envChangeResult.newEnvironment.code === '2'
                                        ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-500/25'
                                        : 'bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-500/25'
                                }`}
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CertificateSection;

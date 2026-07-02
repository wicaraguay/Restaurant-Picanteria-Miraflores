/**
 * @file ChangePasswordModal.tsx
 * @description Modal para cambiar contraseña del usuario autenticado
 */

import React, { useState } from 'react';
import Modal from '../../../components/ui/Modal';
import { EyeIcon, EyeOffIcon } from '../../../components/ui/Icons';
import { api } from '../../../api';
import { toast } from '../../../components/ui/AlertProvider';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const inputClass = "w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3 pr-10 text-gray-900 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all dark:border-gray-700 dark:bg-dark-800 dark:text-white";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 6) {
            setError('La nueva contrasena debe tener al menos 6 caracteres');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Las contrasenas no coinciden');
            return;
        }

        setIsLoading(true);

        try {
            await api.auth.changePassword(currentPassword, newPassword);
            toast.success('Contrasena actualizada correctamente', 'Exito');
            handleClose();
        } catch (err: any) {
            setError(err.message || 'Error al cambiar la contrasena');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setError('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="CAMBIAR CONTRASENA">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                            Contrasena Actual
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className={inputClass}
                                placeholder="Tu contrasena actual"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords(!showPasswords)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPasswords ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                            Nueva Contrasena
                        </label>
                        <input
                            type={showPasswords ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className={inputClass}
                            placeholder="Minimo 6 caracteres"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                            Confirmar Nueva Contrasena
                        </label>
                        <input
                            type={showPasswords ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={inputClass}
                            placeholder="Repite la nueva contrasena"
                            required
                        />
                    </div>
                </div>

                {error && (
                    <div className="flex items-center p-3 text-sm text-red-600 bg-red-50 rounded-xl dark:bg-red-900/20 dark:text-red-300 border border-red-100 dark:border-red-800/50">
                        <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {error}
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-6 py-3 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-dark-700 dark:text-gray-400 font-bold text-xs uppercase tracking-widest transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-8 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                    >
                        {isLoading ? 'Guardando...' : 'Cambiar Contrasena'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default ChangePasswordModal;

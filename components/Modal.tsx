import React, { useEffect } from 'react';
import { X } from './Icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';
    }
    return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#141210]/60 dark:bg-[#141210]/60 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-700 rounded-2xl shadow-diffuse-light dark:shadow-diffuse border border-gray-100 dark:border-transparent flex flex-col max-h-[90vh] animate-fade-in transition-opacity duration-300">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/5">
          <h2 className="text-xl font-medium text-gray-900 dark:text-zinc-100">{title}</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>

        {footer && (
          <div className="p-6 pt-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-transparent rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
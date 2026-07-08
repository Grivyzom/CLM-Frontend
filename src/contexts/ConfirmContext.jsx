import React, { createContext, useContext, useState, useCallback } from 'react';
import ConfirmModal from '../components/ui/ConfirmModal';

const ConfirmContext = createContext(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm debe ser usado dentro de un ConfirmProvider');
  }
  return context;
}

export function ConfirmProvider({ children }) {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    isDangerous: false,
    bypassKey: '',
    bypassDurationMinutes: 30,
    loading: false
  });

  const confirm = useCallback((options) => {
    return new Promise((resolve, reject) => {
      setModalState({
        isOpen: true,
        title: options.title || 'Confirmar',
        message: options.message || '¿Estás seguro?',
        isDangerous: options.isDangerous || false,
        bypassKey: options.bypassKey || '',
        bypassDurationMinutes: options.bypassDurationMinutes || 30,
        loading: false,
        onConfirm: async () => {
          if (options.action) {
            setModalState(prev => ({ ...prev, loading: true }));
            try {
              await options.action();
              setModalState(prev => ({ ...prev, isOpen: false, loading: false }));
              resolve(true);
            } catch (error) {
              setModalState(prev => ({ ...prev, loading: false }));
              // Permitimos que la vista que llamó a confirm maneje el error
              reject(error);
            }
          } else {
            setModalState(prev => ({ ...prev, isOpen: false }));
            resolve(true);
          }
        },
        onCancel: () => {
          setModalState(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
    });
  }, []);

  const alertModal = useCallback((options) => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        title: options.title || 'Alerta',
        message: options.message || '',
        isDangerous: options.isDangerous || false,
        isAlert: true,
        bypassKey: '',
        bypassDurationMinutes: 30,
        loading: false,
        onConfirm: () => {
          setModalState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setModalState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        }
      });
    });
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm, alert: alertModal }}>
      {children}
      {modalState.isOpen && (
        <ConfirmModal
          title={modalState.title}
          message={modalState.message}
          onConfirm={modalState.onConfirm}
          onCancel={modalState.onCancel}
          isDangerous={modalState.isDangerous}
          bypassKey={modalState.bypassKey}
          bypassDurationMinutes={modalState.bypassDurationMinutes}
          loading={modalState.loading}
          isAlert={modalState.isAlert}
        />
      )}
    </ConfirmContext.Provider>
  );
}

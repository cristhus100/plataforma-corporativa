'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider')
  return ctx
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [confirmState, setConfirmState] = useState(null)
  const confirmResolveRef = useRef(null)
  let idCounter = useRef(0)

  const addToast = useCallback((message, opts = {}) => {
    const id = ++idCounter.current
    const toast = {
      id,
      message,
      type: opts.type || 'info',
      duration: opts.duration ?? 4000,
    }
    setToasts(prev => [...prev, toast])
    if (toast.duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, toast.duration)
    }
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const confirm = useCallback((message, opts = {}) => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve
      setConfirmState({
        title: opts.title || 'Confirmar',
        message,
        confirmText: opts.confirmText || 'Aceptar',
        cancelText: opts.cancelText || 'Cancelar',
        variant: opts.variant || 'danger', // danger | default
      })
    })
  }, [])

  const handleConfirm = useCallback((result) => {
    if (confirmResolveRef.current) {
      confirmResolveRef.current(result)
      confirmResolveRef.current = null
    }
    setConfirmState(null)
  }, [])

  return (
    <ToastContext.Provider value={{ addToast, removeToast, confirm, toasts, confirmState, handleConfirm }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {confirmState && (
        <ConfirmDialog
          state={confirmState}
          onConfirm={() => handleConfirm(true)}
          onCancel={() => handleConfirm(false)}
        />
      )}
    </ToastContext.Provider>
  )
}

/* ─── Toast Container ─── */

function ToastContainer({ toasts, removeToast }) {
  if (toasts.length === 0) return null

  const typeStyles = {
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    warning: 'bg-orange-500 text-white',
    info: 'bg-gray-800 text-white',
  }

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg animate-slide-up ${typeStyles[toast.type] || typeStyles.info}`}
        >
          <span className="text-lg font-bold flex-shrink-0">{icons[toast.type] || icons.info}</span>
          <p className="text-sm flex-1">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-white/70 hover:text-white flex-shrink-0 text-lg leading-none"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  )
}

/* ─── Confirm Dialog ─── */

function ConfirmDialog({ state, onConfirm, onCancel }) {
  const variantStyles = {
    danger: {
      icon: 'bg-red-100 text-red-600',
      confirm: 'bg-red-600 hover:bg-red-700 text-white',
    },
    default: {
      icon: 'bg-blue-100 text-blue-600',
      confirm: 'bg-gray-900 hover:bg-gray-800 text-white',
    },
  }

  const vs = variantStyles[state.variant] || variantStyles.danger

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9998] p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${vs.icon}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{state.title}</h3>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-6">{state.message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            {state.cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${vs.confirm}`}
          >
            {state.confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'
import React, { useCallback, useState } from 'react'
import { AlertTriangle, Info } from 'lucide-react'

interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  alertOnly?: boolean
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void
}

/**
 * Promise-based replacement for window.confirm()/alert(), styled to match the admin design system.
 * Usage: const { confirm, alert, dialog } = useConfirmDialog()
 *   if (!(await confirm({ title: '...', message: '...' }))) return
 *   await alert({ title: '...', message: '...' })
 *   ...render {dialog} once anywhere in the component tree
 */
export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmState | null>(null)

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, resolve })
    })
  }, [])

  const alert = useCallback((options: Omit<ConfirmOptions, 'alertOnly' | 'cancelLabel'>) => {
    return confirm({ ...options, alertOnly: true }).then(() => undefined)
  }, [confirm])

  const respond = (value: boolean) => {
    setState(current => {
      current?.resolve(value)
      return null
    })
  }

  const dialog = state ? (
    <ConfirmDialog
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      danger={state.danger}
      alertOnly={state.alertOnly}
      onConfirm={() => respond(true)}
      onCancel={() => respond(false)}
    />
  ) : null

  return { confirm, alert, dialog }
}

interface ConfirmDialogProps {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  alertOnly?: boolean
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({ title, message, confirmLabel, cancelLabel = 'Cancel', danger = true, alertOnly = false, onConfirm, onCancel }: ConfirmDialogProps) {
  const resolvedConfirmLabel = confirmLabel ?? (alertOnly ? 'Got it' : 'Delete')
  const tint = alertOnly || !danger ? 'indigo' : 'red'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${tint === 'red' ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-500'}`}>
          {alertOnly ? <Info className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
        </div>
        <h3 id="confirm-dialog-title" className="text-base font-bold text-gray-800 mb-1.5">{title}</h3>
        {message && <p className="text-sm text-gray-500 leading-relaxed">{message}</p>}
        <div className="flex items-center justify-end gap-2 mt-5">
          {!alertOnly && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-full text-sm font-bold text-gray-600 hover:bg-gray-100 transition"
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={onConfirm}
            autoFocus
            className={`px-4 py-2 rounded-full text-sm font-bold text-white transition ${tint === 'red' ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-500 hover:bg-indigo-600'}`}
          >
            {resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

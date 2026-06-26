'use client'
import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props { children: React.ReactNode; name?: string }
interface State { hasError: boolean; error?: Error }

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center max-w-sm shadow-sm">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <h3 className="text-[15px] font-bold text-gray-800 mb-1">Something went wrong</h3>
            <p className="text-[12px] text-gray-400 mb-1">{this.props.name ?? 'This section'} encountered an error.</p>
            <p className="text-[11px] text-red-400 font-mono mb-4 break-all">{this.state.error?.message}</p>
            <button onClick={() => this.setState({ hasError: false, error: undefined })}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[12px] rounded-lg px-4 py-2 transition">
              <RefreshCw size={13} /> Try Again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-5xl mb-4">🙈</p>
          <h2 className="font-baloo font-black text-ds-text text-[20px] mb-2">
            Something went wrong
          </h2>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 px-6 py-3 font-bold text-white shadow-md transition"
            style={{ backgroundColor: "var(--nimi-green)", borderRadius: "var(--leaf-r)" }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

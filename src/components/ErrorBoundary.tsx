import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center space-y-6 border border-stone-100">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-stone-900">Something went wrong</h1>
              <p className="text-stone-500 text-sm">
                {this.state.error?.message.includes("{") 
                  ? "A database error occurred. Please try again later."
                  : "An unexpected error occurred while rendering the application."}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-teal-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-teal-800 transition-all shadow-lg"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

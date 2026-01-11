import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center p-4">
                    <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-2xl max-w-md w-full text-center">
                        <h2 className="text-2xl font-bold mb-4 text-red-500">Something went wrong</h2>
                        <p className="text-gray-300 mb-6">
                            We're sorry, but the application encountered an unexpected error.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-full transition-colors font-medium"
                        >
                            Reload Application
                        </button>
                        {this.state.error && (
                            <pre className="mt-6 p-4 bg-black/30 rounded text-left text-xs text-gray-500 overflow-auto max-h-32">
                                {this.state.error.toString()}
                            </pre>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

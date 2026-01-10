import React from 'react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
                    <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8 border border-red-100">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-3xl">💥</span>
                        </div>
                        <h1 className="text-2xl font-bold text-center text-red-600 mb-2">System Error</h1>
                        <p className="text-center text-slate-500 mb-6">
                            Something went wrong in the application. Usage validation failed or a component crashed.
                            <br />Please refresh the page.
                        </p>

                        <div className="bg-slate-100 p-4 rounded text-xs font-mono overflow-auto max-h-40 mb-6">
                            {this.state.error && this.state.error.toString()}
                            <br />
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </div>

                        <button
                            onClick={() => window.location.href = '/'}
                            className="w-full py-3 bg-red-600 text-white font-bold rounded hover:bg-red-700 transition"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

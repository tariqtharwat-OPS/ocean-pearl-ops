import React from 'react';
import { useLocation, Link } from 'react-router-dom';

export default function NotFound() {
    const location = useLocation();
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-xl shadow-xl max-w-lg w-full text-center">
                <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Page Not Found</h2>
                <p className="text-gray-500 mb-6">
                    The requested path <code className="bg-gray-100 px-2 py-1 rounded text-red-500">{location.pathname}</code> does not exist or you do not have permission to view it.
                </p>
                <div className="flex gap-4 justify-center">
                    <Link to="/" className="btn btn-primary">
                        Return Home
                    </Link>
                </div>
            </div>
        </div>
    );
}

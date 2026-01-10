import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            console.error("Login Failed", err);
            setError(t('auth_error', 'Sign In Failed: Check your credentials.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            {/* Main Card Container */}
            <div className="grid grid-cols-1 md:grid-cols-2 w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[600px]">

                {/* Left Column: Brand Panel */}
                <div className="bg-slate-900 flex flex-col items-center justify-center p-12 relative overflow-hidden text-center">
                    {/* Abstract Background Decoration */}
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                        <div className="absolute -top-[20%] -left-[20%] w-[80%] h-[80%] rounded-full bg-blue-500 blur-3xl"></div>
                        <div className="absolute bottom-[0%] right-[0%] w-[60%] h-[60%] rounded-full bg-emerald-500 blur-3xl"></div>
                    </div>

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="brand-logo-container mb-8">
                            <img src="/assets/logo.png" alt="Ocean Pearl" className="rounded-xl shadow-2xl" />
                        </div>
                        <h2 className="text-white text-3xl font-bold mb-4 tracking-tight">Ocean Pearl Seafood</h2>
                        <div className="h-1 w-20 bg-blue-500 rounded-full mb-6"></div>
                        <p className="text-slate-400 text-lg max-w-xs font-medium leading-relaxed">
                            Operational & Financial Control System
                        </p>
                        <p className="text-slate-500 text-sm mt-8">
                            v1.5.0 • Live
                        </p>
                    </div>
                </div>

                {/* Right Column: Login Form */}
                <div className="relative flex flex-col justify-center p-8 md:p-14 bg-white">
                    <div className="w-full max-w-md mx-auto">
                        <div className="mb-8">
                            <h1 className="text-3xl font-extrabold text-slate-800 mb-2">{t('auth_btn', 'Sign In')}</h1>
                            <p className="text-slate-500">Access your operations dashboard</p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
                                <span className="text-red-500 font-bold">!</span>
                                <p className="text-sm font-bold text-red-600">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700 ml-1">{t('email')}</label>
                                <input
                                    type="email"
                                    className="input-field bg-slate-50 border-slate-200 focus:bg-white h-12"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="user@oceanpearl.com"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700 ml-1">{t('password')}</label>
                                <input
                                    type="password"
                                    className="input-field bg-slate-50 border-slate-200 focus:bg-white h-12"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn btn-primary w-full h-12 text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span>Verifying...</span>
                                        </span>
                                    ) : t('auth_btn', 'Sign In')}
                                </button>
                            </div>
                        </form>

                        <div className="mt-8 flex items-center justify-between text-sm">
                            <button className="text-slate-400 hover:text-slate-600 font-medium transition-colors">Forgot password?</button>
                            <button className="text-blue-600 hover:text-blue-700 font-bold transition-colors">Contact Admin</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { Link } from 'react-router-dom';

export default function Home() {
    return (
        <div className="min-h-screen bg-black text-white">
            {/* Subtle grid pattern background */}
            <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]"></div>

            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
                {/* Logo & Header */}
                <div className="text-center mb-16 animate-[fadeIn_0.8s_ease-out]">
                    <div className="inline-flex items-center justify-center w-20 h-20 mb-8 border border-white/20 rounded-2xl bg-white/5 backdrop-blur-sm transition-transform duration-500 hover:scale-105 hover:border-white/40">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-4">
                        Spoof Collection
                    </h1>
                    <p className="text-lg text-white/50 font-light max-w-md mx-auto">
                        Professional image capture and synchronization system
                    </p>
                </div>

                {/* Device Cards */}
                <div className="grid md:grid-cols-2 gap-6 max-w-3xl w-full animate-[fadeIn_1s_ease-out_0.2s_both]">
                    {/* Device A Card */}
                    <Link
                        to="/device-a"
                        className="group relative p-8 border border-white/10 rounded-2xl bg-white/[0.02] backdrop-blur-sm
                       hover:border-white/30 hover:bg-white/[0.05] transition-all duration-500
                       hover:shadow-[0_0_40px_rgba(255,255,255,0.05)]"
                    >
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-12 h-12 border border-white/20 rounded-xl flex items-center justify-center group-hover:border-white/40 group-hover:bg-white/5 transition-all duration-300">
                                <svg className="w-6 h-6 text-white/70 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-medium text-white mb-1">Device A</h2>
                                <p className="text-sm text-white/40">Display Controller</p>
                            </div>
                        </div>

                        <ul className="space-y-3 text-sm text-white/50 mb-6">
                            <li className="flex items-center gap-3">
                                <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                                Upload original images
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                                Control display sequence
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                                Monitor session progress
                            </li>
                        </ul>

                        <div className="flex items-center text-sm text-white/40 group-hover:text-white/70 transition-colors">
                            <span>Open interface</span>
                            <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </div>
                    </Link>

                    {/* Device B Card */}
                    <Link
                        to="/device-b"
                        className="group relative p-8 border border-white/10 rounded-2xl bg-white/[0.02] backdrop-blur-sm
                       hover:border-white/30 hover:bg-white/[0.05] transition-all duration-500
                       hover:shadow-[0_0_40px_rgba(255,255,255,0.05)]"
                    >
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-12 h-12 border border-white/20 rounded-xl flex items-center justify-center group-hover:border-white/40 group-hover:bg-white/5 transition-all duration-300">
                                <svg className="w-6 h-6 text-white/70 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-medium text-white mb-1">Device B</h2>
                                <p className="text-sm text-white/40">Camera Device</p>
                            </div>
                        </div>

                        <ul className="space-y-3 text-sm text-white/50 mb-6">
                            <li className="flex items-center gap-3">
                                <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                                Select checkpoints
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                                Capture spoof photos
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                                Upload captured images
                            </li>
                        </ul>

                        <div className="flex items-center text-sm text-white/40 group-hover:text-white/70 transition-colors">
                            <span>Open interface</span>
                            <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </div>
                    </Link>
                </div>

                {/* Footer */}
                <p className="mt-16 text-sm text-white/30 animate-[fadeIn_1.2s_ease-out_0.4s_both]">
                    Connect both devices to the same checkpoint
                </p>
            </div>
        </div>
    );
}

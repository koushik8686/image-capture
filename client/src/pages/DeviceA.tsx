import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import type { Session, CaptureConfirmedPayload, CameraReadyPayload } from '../types';

const CHECKPOINTS = [
    "exhaust_fan",
    "clean_radiator_assembly",
    "clean_alternator_terminal_box",
    "clean_genset_floor",
    "lube_oil_filter",
    "fuel_filters",
    "spares_lube_oil_can",
    "spares_coolant_bottle",
    "air_filter"
];

export default function DeviceA() {
    const [checkpointName, setCheckpointName] = useState('');
    const [uploadFiles, setUploadFiles] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
    const [isUploading, setIsUploading] = useState(false);

    const [sessionCheckpoint, setSessionCheckpoint] = useState('');
    const [imageCount, setImageCount] = useState(10);
    const [session, setSession] = useState<Session | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const { isConnected, emit, on, off } = useSocket();
    const deviceId = useRef(`display_${Date.now()}`);

    useEffect(() => {
        const handleCameraReady = (data: unknown) => setIsCameraReady(true);
        const handleCameraDisconnected = () => setIsCameraReady(false);
        const handleCaptureConfirmed = (data: unknown) => {
            setCurrentIndex(prev => {
                const nextIndex = prev + 1;
                if (session && nextIndex >= session.images_queue.length) {
                    emit('session_complete', {
                        session_id: session.session_id,
                        checkpoint_name: session.checkpoint_name
                    });
                    alert('✅ All images processed!');
                    setSession(null);
                    setCurrentIndex(0);
                    setIsCameraReady(false);
                }
                return nextIndex;
            });
        };

        on('camera_ready', handleCameraReady);
        on('camera_disconnected', handleCameraDisconnected);
        on('capture_confirmed', handleCaptureConfirmed);
        return () => {
            off('camera_ready', handleCameraReady);
            off('camera_disconnected', handleCameraDisconnected);
            off('capture_confirmed', handleCaptureConfirmed);
        };
    }, [on, off, emit, session]);

    useEffect(() => {
        if (session && currentIndex < session.images_queue.length && isCameraReady) {
            const currentImage = session.images_queue[currentIndex];
            emit('display_next_image', {
                session_id: session.session_id,
                current_image_id: currentImage.image_id,
                checkpoint_name: session.checkpoint_name,
                image_url: currentImage.image_url,
                // Send filename so Device B can match it
                target_filename: currentImage.original_filename
            });
        }
    }, [currentIndex, session, isCameraReady, emit]);

    const handleUpload = async () => {
        if (!checkpointName || uploadFiles.length === 0) return;
        setIsUploading(true);
        setUploadProgress({ current: 0, total: uploadFiles.length });

        for (let i = 0; i < uploadFiles.length; i++) {
            const formData = new FormData();
            formData.append('checkpoint_name', checkpointName.trim());
            formData.append('image', uploadFiles[i]);
            try {
                await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/upload`, { method: 'POST', body: formData });
                setUploadProgress(prev => ({ ...prev, current: i + 1 }));
            } catch (e) {
                console.error(e);
            }
        }
        setIsUploading(false);
        setUploadFiles([]);
        alert(`✅ Uploaded ${uploadFiles.length} images`);
    };

    const startSession = async () => {
        if (!sessionCheckpoint) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/start-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    checkpoint_name: sessionCheckpoint,
                    image_count: imageCount,
                    device_id: deviceId.current
                })
            });
            const data = await res.json();
            if (data.success) {
                setSession(data);
                setCurrentIndex(0);
                setSidebarOpen(false); // Auto-hide sidebar to show fullscreen
                emit('register_display', {
                    device_id: deviceId.current,
                    checkpoint_name: sessionCheckpoint
                });
            }
        } catch (e) { console.error(e); }
    };

    const currentImage = session?.images_queue[currentIndex];

    return (
        <div className="min-h-screen bg-[#111] text-white overflow-hidden relative font-sans">
            {/* Fullscreen Image Display */}
            <div className="absolute inset-0 z-0 flex items-center justify-center bg-black">
                {session && currentImage ? (
                    <img
                        src={`${import.meta.env.VITE_BACKEND_URL}${currentImage.image_url}`}
                        alt="Current Display"
                        className="w-full h-full object-contain"
                    />
                ) : (
                    <div className="text-center text-white/30">
                        <h1 className="text-4xl font-light tracking-tight mb-2">Review Display</h1>
                        <p>Waiting for session content...</p>
                    </div>
                )}

                {session && !isCameraReady && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-10 w-full h-full">
                        <div className="bg-[#1a1a1a] rounded-xl border border-white/10 p-8 text-center shadow-2xl">
                            <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                            <h3 className="text-xl font-medium mb-1">Waiting for Device B</h3>
                            <p className="text-white/50">Connect camera device to "{session?.checkpoint_name.replace(/_/g, ' ')}"</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Control Sidebar Toggle */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="fixed top-6 left-6 z-50 p-3 rounded-full bg-black/50 hover:bg-black text-white border border-white/10 backdrop-blur-md transition-all shadow-lg"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={sidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                </svg>
            </button>

            {/* Header Info (Always visible nicely) */}
            <div className="fixed top-6 right-6 z-20 flex items-center gap-4">
                <div className="px-4 py-2 rounded-full bg-black/50 border border-white/10 backdrop-blur-md flex items-center gap-3 shadow-lg">
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        <span className="text-xs font-medium uppercase tracking-wider text-white/80">{isConnected ? 'Online' : 'Offline'}</span>
                    </div>
                    {session && (
                        <>
                            <div className="w-px h-3 bg-white/20"></div>
                            <span className="text-xs font-medium text-white/80">
                                {currentIndex + 1} / {session.images_queue.length}
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Sidebar Controls */}
            <div className={`fixed inset-y-0 left-0 w-96 bg-[#111]/95 text-white transform transition-transform duration-500 ease-out z-40 border-r border-white/5 backdrop-blur-xl ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="h-full overflow-y-auto p-8 pt-24 custom-scrollbar">

                    {/* Header */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-light mb-1">Device A</h2>
                        <p className="text-sm text-white/40">Master Controller</p>
                    </div>

                    {/* Session Panel */}
                    <div className="mb-8 relative z-50">
                        <h3 className="text-xs font-bold text-white/30 uppercase tracking-wider mb-4">Active Session</h3>
                        <div className="space-y-4">
                            <select
                                value={sessionCheckpoint}
                                onChange={e => setSessionCheckpoint(e.target.value)}
                                className="w-full bg-[#222] border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-white/30"
                                disabled={!!session}
                            >
                                <option value="">Select Checkpoint...</option>
                                {CHECKPOINTS.map(cp => (
                                    <option key={cp} value={cp}>{cp.replace(/_/g, ' ').toUpperCase()}</option>
                                ))}
                            </select>

                            {!session && (
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        value={imageCount}
                                        onChange={e => setImageCount(parseInt(e.target.value) || 1)}
                                        min="1"
                                        className="w-20 bg-[#222] border border-white/10 rounded-lg px-3 py-3 text-center text-sm focus:outline-none"
                                    />
                                    <button
                                        onClick={startSession}
                                        disabled={!sessionCheckpoint}
                                        className="flex-1 bg-white text-black font-medium rounded-lg py-3 text-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
                                    >
                                        Start Session
                                    </button>
                                </div>
                            )}

                            {session && (
                                <button
                                    onClick={() => {
                                        if (confirm('End session?')) {
                                            setSession(null);
                                            setSidebarOpen(true);
                                        }
                                    }}
                                    className="w-full border border-red-500/30 text-red-400 font-medium rounded-lg py-3 text-sm hover:bg-red-500/10 transition-colors"
                                >
                                    End Session
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Upload Panel */}
                    <div className="pt-8 border-t border-white/10">
                        <h3 className="text-xs font-bold text-white/30 uppercase tracking-wider mb-4">Upload New Images</h3>

                        <div className="space-y-4">
                            <select
                                value={checkpointName}
                                onChange={e => setCheckpointName(e.target.value)}
                                className="w-full bg-[#222] border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-white/30"
                            >
                                <option value="">Select Checkpoint...</option>
                                {CHECKPOINTS.map(cp => (
                                    <option key={cp} value={cp}>{cp.replace(/_/g, ' ').toUpperCase()}</option>
                                ))}
                            </select>

                            <div className="relative border-2 border-dashed border-white/10 rounded-xl hover:border-white/20 transition-colors bg-[#161616]">
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={e => setUploadFiles(Array.from(e.target.files || []))}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                />
                                <div className="p-6 text-center">
                                    {uploadFiles.length > 0 ? (
                                        <p className="text-sm font-medium text-emerald-400">{uploadFiles.length} files selected</p>
                                    ) : (
                                        <>
                                            <p className="text-sm text-white/50 mb-1">Drop images here</p>
                                            <p className="text-xs text-white/30">or click to browse</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleUpload}
                                disabled={isUploading || !checkpointName || uploadFiles.length === 0}
                                className="w-full bg-[#333] text-white font-medium rounded-lg py-3 text-sm hover:bg-[#444] transition-colors disabled:opacity-50"
                            >
                                {isUploading ? `Uploading ${uploadProgress.current}/${uploadProgress.total}...` : 'Upload Images'}
                            </button>

                            {isUploading && (
                                <div className="h-1 bg-[#222] rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}></div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/10">
                        <Link to="/" className="text-white/30 text-sm hover:text-white transition-colors flex items-center gap-2">
                            ← Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

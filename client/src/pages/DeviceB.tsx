import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import type { Checkpoint, DisplayImagePayload, SessionEndedPayload } from '../types';

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

// Add target_filename to interface locally (or update types/index.ts)
interface DisplayImagePayloadExtended extends DisplayImagePayload {
    target_filename?: string;
}

export default function DeviceB() {
    const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
    const [selectedCheckpoint, setSelectedCheckpoint] = useState('');
    const [isConnectedToCheckpoint, setIsConnectedToCheckpoint] = useState(false);

    const [currentImage, setCurrentImage] = useState<DisplayImagePayloadExtended | null>(null);
    const [capturedFile, setCapturedFile] = useState<File | null>(null);
    const [capturedPreview, setCapturedPreview] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [displayConnected, setDisplayConnected] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { isConnected, emit, on, off } = useSocket();
    const deviceId = useRef(`camera_${Date.now()}`);

    useEffect(() => {
        const loadCheckpoints = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/checkpoints`);
                const data = await res.json();
                setCheckpoints(data.checkpoints || []);
            } catch (e) { console.error(e); }
        };
        loadCheckpoints();
    }, []);

    useEffect(() => {
        const handleDisplayImage = (data: unknown) => {
            console.log('Display image:', data);
            setCurrentImage(data as DisplayImagePayloadExtended);
            setCapturedFile(null);
            setCapturedPreview('');
        };
        const handleSessionEnded = () => {
            alert('✅ Session completed!');
            setCurrentImage(null);
            setCapturedFile(null);
            setCapturedPreview('');
        };
        const handleDisplayConnected = () => setDisplayConnected(true);
        const handleDisplayDisconnected = () => setDisplayConnected(false);

        on('display_image', handleDisplayImage);
        on('session_ended', handleSessionEnded);
        on('display_connected', handleDisplayConnected);
        on('display_disconnected', handleDisplayDisconnected);

        return () => {
            off('display_image', handleDisplayImage);
            off('session_ended', handleSessionEnded);
            off('display_connected', handleDisplayConnected);
            off('display_disconnected', handleDisplayDisconnected);
        };
    }, [on, off]);

    // Auto-trigger camera when new image is received
    useEffect(() => {
        if (currentImage && !capturedFile && !capturedPreview) {
            // Small delay to ensure render
            setTimeout(() => {
                fileInputRef.current?.click();
            }, 500);
        }
    }, [currentImage, capturedFile, capturedPreview]);

    const connectToCheckpoint = () => {
        if (!selectedCheckpoint) return;
        emit('register_camera', { device_id: deviceId.current, checkpoint_name: selectedCheckpoint });
        setIsConnectedToCheckpoint(true);
    };

    const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCapturedFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setCapturedPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const uploadSpoof = async () => {
        if (!capturedFile || !currentImage) return;
        setIsUploading(true);

        const formData = new FormData();
        formData.append('image_id', currentImage.image_id);
        formData.append('checkpoint_name', currentImage.checkpoint_name);
        formData.append('session_id', currentImage.session_id);
        // Pass the target filename so backend uses it
        if (currentImage.target_filename) {
            formData.append('target_filename', currentImage.target_filename);
        }
        formData.append('spoof_image', capturedFile);

        try {
            // Add query params for Multer storage engine
            const queryParams = new URLSearchParams({
                image_id: currentImage.image_id,
                checkpoint_name: currentImage.checkpoint_name
            }).toString();

            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/upload-spoof?${queryParams}`, {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            setCapturedFile(null);
            setCapturedPreview('');
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (e) {
            console.error(e);
            alert('Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    if (!isConnectedToCheckpoint) {
        return (
            <div className="min-h-screen bg-[#111] text-white flex items-center justify-center p-6">
                <div className="w-full max-w-md bg-[#222] border border-white/10 rounded-2xl p-8 shadow-2xl">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                            <svg className="w-8 h-8 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-light">Camera Setup</h2>
                        <p className="text-white/40 text-sm mt-1">Select checkpoint to begin</p>
                    </div>

                    <div className="space-y-4">
                        <select
                            value={selectedCheckpoint}
                            onChange={e => setSelectedCheckpoint(e.target.value)}
                            className="w-full bg-[#161616] border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-white/30"
                        >
                            <option value="">Select Checkpoint...</option>
                            {CHECKPOINTS.map(cp => (
                                <option key={cp} value={cp}>{cp.replace(/_/g, ' ').toUpperCase()}</option>
                            ))}
                        </select>

                        <button
                            onClick={connectToCheckpoint}
                            disabled={!selectedCheckpoint}
                            className="w-full bg-white text-black font-medium rounded-xl py-4 hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                            Connect Camera
                        </button>

                        <div className="text-center">
                            <Link to="/" className="text-white/30 text-sm hover:text-white transition-colors">Cancel</Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#111] text-white flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#161616]">
                <div>
                    <h2 className="font-medium text-lg">{selectedCheckpoint.replace(/_/g, ' ').toUpperCase()}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${displayConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                        <span className="text-xs text-white/50">{displayConnected ? 'Linked to Display' : 'Waiting for Display'}</span>
                    </div>
                </div>
                <button onClick={() => setIsConnectedToCheckpoint(false)} className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg text-sm text-white/60">
                    Exit
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 flex flex-col max-w-lg mx-auto w-full">
                {!currentImage ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-white/30 space-y-4">
                        <div className="w-20 h-20 border-2 border-white/10 border-t-white/30 rounded-full animate-spin"></div>
                        <p>Waiting for image from Device A...</p>
                    </div>
                ) : (
                    <div className="space-y-6 flex-1 flex flex-col">
                        {capturedPreview ? (
                            <div className="flex-1 flex flex-col">
                                <div className="bg-[#161616] rounded-2xl p-4 border border-white/10 flex-1 flex flex-col mb-4">
                                    <p className="text-xs font-bold text-white/30 uppercase tracking-wider mb-3">Your Capture</p>
                                    <div className="flex-1 bg-black rounded-lg overflow-hidden flex items-center justify-center border border-white/5 relative">
                                        <img src={capturedPreview} alt="Preview" className="max-h-full max-w-full object-contain absolute" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => { setCapturedFile(null); setCapturedPreview(''); }}
                                        className="py-4 rounded-xl bg-[#222] border border-white/10 font-medium hover:bg-[#333]"
                                    >
                                        Retake
                                    </button>
                                    <button
                                        onClick={uploadSpoof}
                                        disabled={isUploading}
                                        className="py-4 rounded-xl bg-white text-black font-medium hover:bg-gray-200"
                                    >
                                        {isUploading ? 'Uploading...' : 'Confirm Upload'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col justify-end">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleCapture}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full py-8 rounded-2xl bg-white text-black font-bold text-xl shadow-lg hover:bg-gray-100 active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    </svg>
                                    Capture Photo
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

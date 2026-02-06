import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// Use current window location for socket connection (works for both localhost and network)
const getSocketUrl = () => {
    return import.meta.env.VITE_BACKEND_URL || `${window.location.protocol}//${window.location.hostname}:3001`;
};

export function useSocket() {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const socketUrl = getSocketUrl();
        console.log('Connecting to socket:', socketUrl);

        socketRef.current = io(socketUrl, {
            transports: ['websocket', 'polling'],
            autoConnect: true,
        });

        socketRef.current.on('connect', () => {
            console.log('Socket connected:', socketRef.current?.id);
            setIsConnected(true);
        });

        socketRef.current.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsConnected(false);
        });

        socketRef.current.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    const emit = useCallback((event: string, data: unknown) => {
        if (socketRef.current) {
            socketRef.current.emit(event, data);
        }
    }, []);

    const on = useCallback((event: string, callback: (data: unknown) => void) => {
        if (socketRef.current) {
            socketRef.current.on(event, callback);
        }
        return () => {
            if (socketRef.current) {
                socketRef.current.off(event, callback);
            }
        };
    }, []);

    const off = useCallback((event: string, callback?: (data: unknown) => void) => {
        if (socketRef.current) {
            socketRef.current.off(event, callback);
        }
    }, []);

    return { socket: socketRef.current, isConnected, emit, on, off };
}

export interface ImageInfo {
    image_id: string;
    checkpoint_name: string;
    is_processed: boolean;
    camera_config?: any;
    uploaded_at: string;
    processed_at?: string;
    original_filename: string;
    original_file_path: string;
    spoofed_file_path?: string;
    sequence_order: number;
    file_extension: string;
    image_url?: string;
}

export interface Checkpoint {
    name: string;
    total_images: number;
    processed_images: number;
    pending_images: number;
}

export interface Session {
    session_id: string;
    checkpoint_name: string;
    device_a_id?: string;
    device_b_id?: string;
    images_queue: ImageInfo[];
    status: string;
}

export interface DisplayImagePayload {
    session_id: string;
    image_id: string;
    checkpoint_name: string;
    image_url: string;
    target_filename?: string;
}

export interface CaptureConfirmedPayload {
    image_id: string;
    spoofed_file_path: string;
}

export interface CameraReadyPayload {
    device_id: string;
    checkpoint_name: string;
}

export interface SessionEndedPayload {
    session_id: string;
    checkpoint_name: string;
}

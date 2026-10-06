import { supabase, logSupabaseError } from '../lib/supabaseClient';

export interface UploadDesignResult {
  success: boolean;
  publicUrl?: string;
  storagePath?: string;
  error?: string;
}

// Memory cache to prevent duplicate uploads when clicking buttons multiple times
const uploadedFileCache = new Map<string, string>();

function getFileCacheKey(file: File, userIdOrSession?: string): string {
  return `${userIdOrSession || 'guest'}_${file.name}_${file.size}_${file.lastModified}`;
}

export const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
];

export const MAX_FILE_SIZE_MB = 15;

/**
 * Uploads a custom design file to Supabase Storage in bucket 'custom-designs'
 * Structured path: custom-designs/{userOrSessionId}/{unique_filename}
 * Returns permanent HTTPS public URL.
 */
export async function uploadCustomDesignFile(
  file: File,
  userIdOrSession?: string
): Promise<UploadDesignResult> {
  if (!file) {
    return { success: false, error: 'No design file provided.' };
  }

  // Check file size (15MB)
  const fileSizeMb = file.size / (1024 * 1024);
  if (fileSizeMb > MAX_FILE_SIZE_MB) {
    return {
      success: false,
      error: `File is too large (${fileSizeMb.toFixed(1)}MB). Max allowed size is ${MAX_FILE_SIZE_MB}MB.`,
    };
  }

  // Check file type
  const isAllowedType =
    ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase()) ||
    file.name.match(/\.(png|jpe?g|webp|svg|pdf)$/i);

  if (!isAllowedType) {
    return {
      success: false,
      error: 'Unsupported file format. Please upload a PNG, JPG, JPEG, WEBP, SVG, or PDF file.',
    };
  }

  // Check if this exact file was already uploaded in this session
  const cacheKey = getFileCacheKey(file, userIdOrSession);
  const cachedUrl = uploadedFileCache.get(cacheKey);
  if (cachedUrl) {
    return {
      success: true,
      publicUrl: cachedUrl,
    };
  }

  // 1. Try High-Reliability Server Storage Proxy Endpoint First
  try {
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const base64Data = await base64Promise;

    const res = await fetch('/api/upload-custom-design', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileData: base64Data,
        clientOrigin: typeof window !== 'undefined' ? window.location.origin : '',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const fileUrl = data.viewUrl || data.fileUrl;
      if (data.success && fileUrl) {
        uploadedFileCache.set(cacheKey, fileUrl);
        return {
          success: true,
          publicUrl: fileUrl,
        };
      }
    }
  } catch (serverUploadErr: any) {
    console.warn('Server upload proxy failed, trying Supabase storage...', serverUploadErr);
  }

  // 2. Fallback to Supabase Storage 'custom-designs' bucket
  const rawExt = file.name.split('.').pop() || 'png';
  const cleanExt = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '');
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 9);
  const safeSessionId = (userIdOrSession || 'guest').replace(/[^a-zA-Z0-9_-]/g, '_');
  
  const storagePath = `${safeSessionId}/${timestamp}_${randomSuffix}.${cleanExt}`;

  try {
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('custom-designs')
      .upload(storagePath, file, {
        contentType: file.type || 'image/png',
        upsert: false,
        cacheControl: '3600',
      });

    if (!uploadErr && uploadData) {
      const { data: publicUrlData } = supabase.storage
        .from('custom-designs')
        .getPublicUrl(storagePath);

      if (publicUrlData?.publicUrl) {
        uploadedFileCache.set(cacheKey, publicUrlData.publicUrl);
        return {
          success: true,
          publicUrl: publicUrlData.publicUrl,
          storagePath,
        };
      }
    }

    if (uploadErr) {
      logSupabaseError('uploadCustomDesignFile:storage', uploadErr);
    }
  } catch (storageErr) {
    console.warn('Direct Supabase Storage upload error:', storageErr);
  }

  return {
    success: false,
    error: 'Failed to upload your design image. Please check your connection and try again.',
  };
}

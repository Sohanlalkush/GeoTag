import { useCallback, useEffect, useRef, useState } from 'react';

export type FacingMode = 'environment' | 'user';

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<FacingMode>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState<boolean>(false);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  // Stop current active media stream
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setHasTorch(false);
    setTorchOn(false);
  }, []);

  // Multi-tier robust getUserMedia request
  const requestStreamWithFallback = async (mode: FacingMode): Promise<MediaStream> => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Camera API is not supported on this browser or device.');
    }

    // Attempt 1: High definition with ideal facing mode
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
      });
    } catch (err1: any) {
      console.warn('High-res camera attempt failed, trying basic facing mode:', err1);
    }

    // Attempt 2: Basic facing mode without strict resolution
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: mode },
      });
    } catch (err2: any) {
      console.warn('Facing mode attempt failed, trying default video:', err2);
    }

    // Attempt 3: Any available video stream
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: true,
    });
  };

  // Start camera with requested facingMode
  const startCamera = useCallback(
    async (mode: FacingMode = facingMode) => {
      stopStream();
      setCameraError(null);
      setIsSwitching(true);

      try {
        const stream = await requestStreamWithFallback(mode);
        streamRef.current = stream;

        // Attach stream to video element
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('webkit-playsinline', 'true');
          videoRef.current.setAttribute('autoplay', 'true');
          videoRef.current.muted = true;

          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.warn('Autoplay requires user interaction:', playErr);
          }
        }

        // Check if torch/flashlight capability is present
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const capabilities = (videoTrack.getCapabilities && videoTrack.getCapabilities()) || {};
          if ('torch' in capabilities) {
            setHasTorch(true);
          }
        }

        setPermissionState('granted');
        setIsStreaming(true);
      } catch (err: any) {
        console.warn('Camera start error:', err);
        const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
        if (isDenied) {
          setPermissionState('denied');
          setCameraError(
            'Camera permission was not granted. Tap "Start Live Camera" or use device photo capture.'
          );
        } else {
          setCameraError(err.message || 'Unable to open camera on this device.');
        }
        setIsStreaming(false);
      } finally {
        setIsSwitching(false);
      }
    },
    [facingMode, stopStream]
  );

  // Toggle between rear & front camera
  const toggleFacingMode = useCallback(() => {
    const nextMode: FacingMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  }, [facingMode, startCamera]);

  // Toggle torch / flash
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current || !hasTorch) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextTorch = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn('Failed to toggle torch:', err);
    }
  }, [hasTorch, torchOn]);

  // High-resolution photo snapshot from active video stream
  const captureFrame = useCallback((): Promise<HTMLCanvasElement | null> => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      if (!video) {
        resolve(null);
        return;
      }

      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!width || !height) {
        console.warn('Video has no dimensions yet, cannot capture frame');
        resolve(null);
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      // If front camera, mirror image for natural selfie
      if (facingMode === 'user') {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, width, height);

      resolve(canvas);
    });
  }, [facingMode]);

  // Ensure stream is attached if video element was mounted after stream was acquired
  useEffect(() => {
    if (videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.warn);
    }
  });

  // Try auto-starting on mount
  useEffect(() => {
    startCamera();
    return () => stopStream();
  }, []);

  return {
    videoRef,
    isStreaming,
    facingMode,
    hasTorch,
    torchOn,
    cameraError,
    isSwitching,
    permissionState,
    startCamera,
    stopStream,
    toggleFacingMode,
    toggleTorch,
    captureFrame,
  };
}

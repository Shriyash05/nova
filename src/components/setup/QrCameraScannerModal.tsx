import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Camera, X, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface QrCameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedValue: string) => void;
}

export const QrCameraScannerModal: React.FC<QrCameraScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [scannedCode, setScannedCode] = useState<string | null>(null);

  const parseScannedUrl = useCallback((data: string): string => {
    try {
      if (data.startsWith('http://') || data.startsWith('https://')) {
        const url = new URL(data);
        const tokenParam = url.searchParams.get('token');
        if (tokenParam) return tokenParam;

        const dParam = url.searchParams.get('d');
        if (dParam) {
          return dParam.startsWith('nova-c3-') ? dParam : `nova-c3-${dParam}`;
        }

        const deviceIdParam = url.searchParams.get('deviceId');
        if (deviceIdParam) return deviceIdParam;
      }
    } catch {
      // not a valid URL, return raw string
    }
    return data.trim();
  }, []);

  const stopCamera = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setErrorMessage(null);
    setScannedCode(null);

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch {
        // Fallback to any available video input if specified facingMode fails
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }
      setHasPermission(true);

      const scanLoop = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          // attemptBoth ensures both regular black-on-white and inverted white-on-black QRs scan instantly
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });

          if (code && code.data) {
            const parsed = parseScannedUrl(code.data);
            setScannedCode(parsed);
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              try {
                navigator.vibrate(80);
              } catch {
                // ignore
              }
            }
            setTimeout(() => {
              stopCamera();
              onScanSuccess(parsed);
            }, 600);
            return;
          }
        }
        animationFrameIdRef.current = requestAnimationFrame(scanLoop);
      };

      animationFrameIdRef.current = requestAnimationFrame(scanLoop);
    } catch (err: unknown) {
      setHasPermission(false);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Unable to access camera. Please allow camera permissions in your browser.'
      );
    }
  }, [facingMode, onScanSuccess, parseScannedUrl, stopCamera]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        void startCamera();
      }, 0);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen, startCamera, stopCamera]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        stopCamera();
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, stopCamera]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-scanner-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-[#0f1218] border border-cyan-500/30 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#141822]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 id="qr-scanner-title" className="text-sm font-semibold text-white tracking-tight">Scan NOVA OLED QR</h3>
              <p className="text-xs text-zinc-400">Point your camera at the OLED screen</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close scanner dialog"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="relative w-full aspect-square bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanner Overlay UI */}
          {hasPermission && !scannedCode && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-3/4 h-3/4 border-2 border-dashed border-cyan-400/50 rounded-2xl">
                {/* 4 Glowing Corners */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-cyan-400 rounded-br-lg" />

                {/* Animated Horizontal Scanline */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#00e5ff] animate-pulse" />
              </div>
            </div>
          )}

          {/* Success Overlay */}
          {scannedCode && (
            <div className="absolute inset-0 bg-cyan-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-150">
              <CheckCircle2 className="w-14 h-14 text-cyan-400 mb-3 animate-bounce" />
              <div className="text-white font-semibold text-base mb-1">QR Code Detected!</div>
              <div className="text-cyan-300 font-mono text-xs max-w-xs truncate bg-black/60 px-3 py-1.5 rounded-lg border border-cyan-500/30">
                {scannedCode}
              </div>
              <p className="text-zinc-400 text-xs mt-3">Connecting to device...</p>
            </div>
          )}

          {/* Error / No Permission State */}
          {hasPermission === false && (
            <div className="absolute inset-0 bg-[#0f1218] flex flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="w-12 h-12 text-rose-400 mb-3" />
              <div className="text-white font-medium text-sm mb-1">Camera Access Blocked</div>
              <p className="text-zinc-400 text-xs max-w-xs mb-4">
                {errorMessage || 'Camera access was denied. Please allow camera permissions to scan the OLED QR code.'}
              </p>
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-cyan-500 text-black text-xs font-semibold rounded-lg hover:bg-cyan-400 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/10 bg-[#141822]">
          <button
            type="button"
            onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Switch Camera ({facingMode === 'environment' ? 'Rear' : 'Front'})
          </button>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel / Enter Code Manually
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle, CheckCircle, RefreshCw, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { leaveRequestsAPI } from '../api/leaveRequests';
import { EmployeeRecordsModal } from './EmployeeRecordsPanel';

// CSS styles for QR scanner camera visibility
const scannerStyles = `
  #qr-reader {
    width: 100% !important;
    height: 100% !important;
    min-height: 300px !important;
    background-color: #000 !important;
  }
  #qr-reader video {
    width: 100% !important;
    height: 100% !important;
    min-height: 300px !important;
    max-height: 400px;
    object-fit: cover !important;
    border-radius: 8px;
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    background-color: #000 !important;
  }
  #qr-reader video[src] {
    background-color: #000 !important;
  }
  #qr-reader canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100% !important;
    height: 100% !important;
    z-index: 1;
  }
  #qr-reader__scan_region {
    min-height: 300px !important;
    background-color: #000 !important;
    display: block !important;
    width: 100% !important;
  }
  #qr-reader__dashboard {
    display: none !important;
  }
  #qr-reader__dashboard_section {
    display: none !important;
  }
  #qr-reader__dashboard_section_swaplink {
    display: none !important;
  }
  #qr-reader__dashboard_section_csr {
    display: none !important;
  }
  #qr-reader__dashboard_section_sp {
    display: none !important;
  }
  #qr-reader__dashboard_section_wp {
    display: none !important;
  }
  #qr-reader__scan_region div[data-qr-code-found="false"] {
    display: none !important;
  }
`;

export default function QRScanner({ isOpen, onClose }) {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [cameraId, setCameraId] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [showRecordsModal, setShowRecordsModal] = useState(false);
  const [employeeData, setEmployeeData] = useState(null);
  const scannerRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  const cleanupScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (err) {
        console.log('Scanner cleanup:', err.message);
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    if (isOpen && !initialized) {
      setInitialized(true);
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        getCameras();
      }, 300);
      return () => clearTimeout(timer);
    }

    if (!isOpen) {
      cleanupScanner();
      setInitialized(false);
      setScanning(false);
      setCameraId(null);
      setCameras([]);
      setLoading(false);
    }

    return () => {
      cleanupScanner();
    };
  }, [isOpen, initialized, cleanupScanner]);

  const getCameras = async () => {
    setLoading(true);
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length) {
        setCameras(devices);
        // Use the back camera by default (usually the last one or labeled as environment/back)
        const backCamera = devices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('environment') ||
          device.label.toLowerCase().includes('rear')
        ) || devices[devices.length - 1];
        setCameraId(backCamera.id);
        startScanner(backCamera.id);
      } else {
        setError('No cameras found on this device');
      }
    } catch (err) {
      console.error('Error getting cameras:', err);
      setError('Unable to access camera. Please ensure camera permissions are granted and you are using HTTPS.');
    } finally {
      setLoading(false);
    }
  };

  const startScanner = async (cameraIdToUse) => {
    if (!cameraIdToUse) {
      setError('No camera selected');
      return;
    }

    // Ensure the DOM element exists before starting
    const element = containerRef.current;
    if (!element) {
      setError('Camera container not ready. Please try again.');
      return;
    }

    // Stop any existing scanner first
    await cleanupScanner();

    setScanning(true);
    setError('');
    setSuccess(false);
    setScanResult(null);

    // Small delay to ensure element is fully rendered
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      // First try with camera ID
      try {
        await scanner.start(
          cameraIdToUse,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            disableFlip: false,
            videoConstraints: {
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          },
          (decodedText) => {
            handleScanSuccess(decodedText);
          },
          (errorMessage) => {
            // Only log serious errors
            if (errorMessage && 
                !errorMessage.includes('No QR code found') && 
                !errorMessage.includes('Finding camera') &&
                !errorMessage.includes('Timeout')) {
              console.log('Scan error:', errorMessage);
            }
          }
        );
        console.log('Scanner started successfully with camera ID:', cameraIdToUse);
      } catch (firstError) {
        console.log('First attempt failed, trying with environment facing mode:', firstError);
        // If ID doesn't work, try with facingMode only
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            disableFlip: false
          },
          (decodedText) => {
            handleScanSuccess(decodedText);
          },
          (errorMessage) => {
            if (errorMessage && 
                !errorMessage.includes('No QR code found') && 
                !errorMessage.includes('Finding camera')) {
              console.log('Scan error:', errorMessage);
            }
          }
        );
        console.log('Scanner started with facingMode fallback');
      }
    } catch (err) {
      console.error('Error starting scanner:', err);
      let errorMsg = 'Failed to start camera. ';
      if (err.message && err.message.includes('Permission')) {
        errorMsg += 'Camera permission denied. Please allow camera access in your browser settings.';
      } else if (err.message && err.message.includes('NotAllowed')) {
        errorMsg += 'Camera access not allowed. Please enable camera permissions.';
      } else {
        errorMsg += 'Please check permissions and try again. Make sure you are using HTTPS or localhost.';
      }
      setError(errorMsg);
      setScanning(false);
    }
  };

  const handleScanSuccess = async (decodedText) => {
    try {
      // Validate that this is a valid profile URL
      const url = new URL(decodedText);
      const profilePattern = /\/profile\/view\/([^\/]+)/;
      const match = url.pathname.match(profilePattern);

      if (match && match[1]) {
        const userId = match[1];
        setScanResult(userId);
        setSuccess(true);
        setError('');
        
        // Stop scanning
        cleanupScanner();
        setScanning(false);

        // Navigate to admin/records with the scanned user ID
        // Delay slightly to ensure UI shows success state before navigation
        setTimeout(() => {
          navigate(`/admin/records?userId=${userId}`, { replace: true });
          onClose();
        }, 500);
      } else {
        setError('Invalid QR code. Please scan a valid employee ID.');
      }
    } catch (err) {
      setError('Invalid QR code format. Please scan a valid employee ID.');
    }
  };

  const resetScanner = async () => {
    setScanResult(null);
    setSuccess(false);
    setError('');
    await cleanupScanner();
    if (cameraId) {
      startScanner(cameraId);
    } else {
      getCameras();
    }
  };

  const switchCamera = async () => {
    if (cameras.length > 1) {
      const currentIndex = cameras.findIndex(c => c.id === cameraId);
      const nextIndex = (currentIndex + 1) % cameras.length;
      const nextCamera = cameras[nextIndex];
      setCameraId(nextCamera.id);
      await cleanupScanner();
      startScanner(nextCamera.id);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{scannerStyles}</style>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Camera className="w-6 h-6 text-emerald-700" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800">QR Scanner</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {!success ? (
              <>
                {/* Instructions */}
                <div className="mb-6">
                  <p className="text-slate-600 text-center">
                    Position the QR code within the frame to scan the employee ID
                  </p>
                </div>

                {/* Scanner Container */}
                <div className="relative" ref={containerRef}>
                  <div 
                    id="qr-reader" 
                    className="rounded-lg overflow-hidden bg-slate-900"
                    style={{ minHeight: '300px', width: '100%', position: 'relative' }}
                  />
                  
                  {loading && (
                    <div className="absolute inset-0 bg-slate-100 rounded-lg flex items-center justify-center z-10">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-3"></div>
                        <p className="text-slate-600 text-sm">Accessing camera...</p>
                      </div>
                    </div>
                  )}
                  
                  {!scanning && !loading && (
                    <div className="absolute inset-0 bg-slate-100 rounded-lg flex items-center justify-center z-10">
                      <button
                        onClick={() => cameraId ? startScanner(cameraId) : getCameras()}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Camera className="w-5 h-5" />
                        Start Camera
                      </button>
                    </div>
                  )}
                </div>

                {/* Camera Selection */}
                {cameras.length > 1 && scanning && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={switchCamera}
                      className="flex items-center gap-2 text-slate-600 hover:text-slate-800 text-sm font-medium transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Switch Camera ({cameras.findIndex(c => c.id === cameraId) + 1}/{cameras.length})
                    </button>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                {/* Controls */}
                <div className="mt-6 flex gap-3">
                  {scanning && (
                    <button
                      onClick={cleanupScanner}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Stop Scanner
                    </button>
                  )}
                  <button
                    onClick={resetScanner}
                    className="flex-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </>
            ) : (
              /* Success State */
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-700" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">
                  QR Code Scanned Successfully!
                </h3>
                <p className="text-slate-600 mb-4">
                  Loading employee records...
                </p>
                <div className="animate-pulse">
                  <div className="w-8 h-1 bg-emerald-600 rounded-full mx-auto"></div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-200">
            <div className="text-xs text-slate-500 text-center">
              Only authorized administrators can scan employee QR codes
            </div>
          </div>
        </div>
      </div>

      {/* Employee Records Modal */}
      {showRecordsModal && employeeData && (
        <EmployeeRecordsModal
          isOpen={showRecordsModal}
          onClose={() => {
            setShowRecordsModal(false);
            setEmployeeData(null);
            setSuccess(false);
            setScanResult(null);
          }}
          employee={employeeData}
        />
      )}
    </>
  );
}
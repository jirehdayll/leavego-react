import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function QRScanner({ isOpen, onClose }) {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const scannerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && !scanning) {
      startScanner();
    }

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (err) {
          console.log('Scanner cleared or already destroyed');
        }
      }
    };
  }, [isOpen]);

  const startScanner = () => {
    setScanning(true);
    setError('');
    setSuccess(false);
    setScanResult(null);

    // Clear any existing scanner
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch (err) {
        console.log('Scanner cleared or already destroyed');
      }
    }

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 300, height: 300 },
        aspectRatio: 1.0,
        supportedScanTypes: [0] // 0 = QR_CODE
      },
      false
    );

    scanner.render(
      (decodedText) => {
        handleScanSuccess(decodedText);
      },
      (errorMessage) => {
        // Only log serious errors, not continuous scan attempts
        if (errorMessage && !errorMessage.includes('No QR code found')) {
          console.log('Scan error:', errorMessage);
        }
      }
    );

    scannerRef.current = scanner;
  };

  const handleScanSuccess = (decodedText) => {
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
        if (scannerRef.current) {
          scannerRef.current.clear();
        }
        setScanning(false);

        // Redirect to profile after a short delay
        setTimeout(() => {
          navigate(`/profile/view/${userId}`);
          onClose();
        }, 1500);
      } else {
        setError('Invalid QR code. Please scan a valid employee ID.');
      }
    } catch (err) {
      setError('Invalid QR code format. Please scan a valid employee ID.');
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch (err) {
        console.log('Scanner cleared or already destroyed');
      }
    }
    setScanning(false);
  };

  const resetScanner = () => {
    setScanResult(null);
    setSuccess(false);
    setError('');
    startScanner();
  };

  if (!isOpen) return null;

  return (
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
              <div className="relative">
                <div 
                  id="qr-reader" 
                  className="rounded-lg overflow-hidden"
                  style={{ minHeight: '300px' }}
                />
                
                {!scanning && (
                  <div className="absolute inset-0 bg-slate-100 rounded-lg flex items-center justify-center">
                    <button
                      onClick={startScanner}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Camera className="w-5 h-5" />
                      Start Camera
                    </button>
                  </div>
                )}
              </div>

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
                    onClick={stopScanner}
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
                Redirecting to employee profile...
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
  );
}

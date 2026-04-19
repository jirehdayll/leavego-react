import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { X, QrCode, User } from 'lucide-react';

export default function QRCodeModal({ isOpen, onClose, user }) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      generateQRCode();
    }
  }, [isOpen, user]);

  const generateQRCode = async () => {
    setLoading(true);
    try {
      // Create the profile URL that will be encoded in the QR code
      const profileUrl = `${window.location.origin}/profile/view/${user.id}`;
      
      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(profileUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#047857', // emerald-700
          light: '#ffffff'
        }
      });
      
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <QrCode className="w-6 h-6 text-emerald-700" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800">My Employee ID</h2>
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
          {/* User Info */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">
                  {user?.user_metadata?.full_name || user?.email}
                </h3>
                <p className="text-sm text-slate-500">
                  {user?.user_metadata?.position || 'Employee'}
                </p>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center">
            {loading ? (
              <div className="w-64 h-64 bg-slate-100 rounded-lg flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              </div>
            ) : (
              <div className="relative">
                <img 
                  src={qrCodeUrl} 
                  alt="Employee QR Code" 
                  className="w-64 h-64 rounded-lg shadow-lg"
                />
                <div className="absolute -bottom-2 left-0 right-0 text-center">
                  <span className="bg-emerald-700 text-white text-xs px-2 py-1 rounded-full">
                    Employee ID
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-emerald-50 rounded-lg">
            <p className="text-sm text-emerald-700 text-center">
              Scan this QR code to view your employee profile. Only authorized administrators can scan and view your information.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

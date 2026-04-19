// Simple QR code functionality test
import QRCode from 'qrcode';

export const testQRGeneration = async () => {
  try {
    // Test QR code generation
    const testUrl = 'http://localhost:5175/profile/view/test-user-id';
    const qrDataUrl = await QRCode.toDataURL(testUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#047857',
        light: '#ffffff'
      }
    });
    
    console.log('✅ QR Code generation test passed');
    console.log('Generated QR code for URL:', testUrl);
    return qrDataUrl;
  } catch (error) {
    console.error('❌ QR Code generation test failed:', error);
    throw error;
  }
};

export const validateQRUrl = (url) => {
  try {
    const urlObj = new URL(url);
    const profilePattern = /\/profile\/view\/([^\/]+)/;
    const match = urlObj.pathname.match(profilePattern);
    
    if (match && match[1]) {
      console.log('✅ QR URL validation test passed');
      console.log('Extracted user ID:', match[1]);
      return match[1];
    } else {
      throw new Error('Invalid QR code URL format');
    }
  } catch (error) {
    console.error('❌ QR URL validation test failed:', error);
    throw error;
  }
};

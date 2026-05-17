/**
 * Generate a proper UUID v4 string
 * This creates a valid UUID format that PostgreSQL can accept
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export function generateUUID(): string {
  // Use crypto.randomUUID() if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older browsers
  // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const hex = '0123456789abcdef';
  let uuid = '';
  
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += '-';
    } else if (i === 14) {
      uuid += '4'; // Version 4
    } else if (i === 19) {
      uuid += hex[(Math.floor(Math.random() * 4) + 8)]; // 8, 9, a, or b
    } else {
      uuid += hex[Math.floor(Math.random() * 16)];
    }
  }
  
  return uuid;
}

/**
 * Check if a string is a valid UUID format
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
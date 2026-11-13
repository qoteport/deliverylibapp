/**
 * Liberian Phone Number & MoMo USSD Utilities
 */

export type LiberianCarrierId = 'mtn' | 'orange' | 'unknown';

export interface LiberianCarrierInfo {
  id: LiberianCarrierId;
  name: string;
  shortName: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  accentColor: string;
  momoService: string;
  ussdPrefix: string;
}

const MTN_INFO: LiberianCarrierInfo = {
  id: 'mtn',
  name: 'Lonestar Cell MTN',
  shortName: 'MTN MoMo',
  badgeBg: 'bg-[#FFCC00]/15',
  badgeText: 'text-[#996600]',
  badgeBorder: 'border-[#FFCC00]/40',
  accentColor: '#FFCC00',
  momoService: 'MTN Mobile Money',
  ussdPrefix: '*156#',
};

const ORANGE_INFO: LiberianCarrierInfo = {
  id: 'orange',
  name: 'Orange Liberia',
  shortName: 'Orange Money',
  badgeBg: 'bg-[#FF6600]/15',
  badgeText: 'text-[#D04900]',
  badgeBorder: 'border-[#FF6600]/40',
  accentColor: '#FF6600',
  momoService: 'Orange Money',
  ussdPrefix: '*144#',
};

/**
 * Detects whether a phone number belongs to Lonestar Cell MTN, Orange Liberia, or is unknown
 */
export function detectLiberianCarrier(raw: any): LiberianCarrierInfo | null {
  if (raw === undefined || raw === null) return null;
  const str = typeof raw === 'string' ? raw : String(raw);
  const digits = str.replace(/[^0-9]/g, '');
  if (digits.length < 3) return null;

  // Normalize: strip leading +231 if present
  let localDigits = digits;
  if (localDigits.startsWith('231')) {
    localDigits = localDigits.substring(3);
  }

  // Handle leading zero: 088 -> 88, 077 -> 77, 055 -> 55, 076 -> 76
  if (localDigits.startsWith('0')) {
    localDigits = localDigits.substring(1);
  }

  // Check Lonestar Cell MTN: 88, 55
  if (localDigits.startsWith('88') || localDigits.startsWith('55') || localDigits.startsWith('8')) {
    if (localDigits.startsWith('88') || localDigits.startsWith('55')) {
      return MTN_INFO;
    }
  }

  // Check Orange Liberia: 77, 76
  if (localDigits.startsWith('77') || localDigits.startsWith('76') || localDigits.startsWith('7')) {
    if (localDigits.startsWith('77') || localDigits.startsWith('76')) {
      return ORANGE_INFO;
    }
  }

  return null;
}

/**
 * Formats a phone input as user types: "0886 123 456" or "+231 886 123 456"
 */
export function formatAsUserTypes(raw: string): string {
  if (!raw) return '';
  const isPlus = raw.trim().startsWith('+');
  const digits = raw.replace(/[^0-9]/g, '');

  if (isPlus) {
    if (digits.startsWith('231')) {
      const rest = digits.substring(3);
      if (rest.length <= 3) return `+231 ${rest}`;
      if (rest.length <= 6) return `+231 ${rest.slice(0, 3)} ${rest.slice(3)}`;
      return `+231 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6, 10)}`;
    }
    return `+${digits}`;
  }

  // Local style: 0886 123 456 or 886 123 456
  if (digits.startsWith('0')) {
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
  } else if (digits.length >= 8 && digits.startsWith('231')) {
    const rest = digits.substring(3);
    return `+231 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6, 10)}`.trim();
  } else {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
  }
}

/**
 * Normalizes input phone numbers to international standard +231 format
 */
export function normalizeLiberianPhoneNumber(raw: any): string {
  if (raw === undefined || raw === null) return '';
  const str = typeof raw === 'string' ? raw : String(raw);
  if (!str) return '';
  const digits = str.replace(/[^0-9]/g, '');

  if (digits.startsWith('231')) {
    return `+${digits}`;
  }
  if (digits.startsWith('0') && digits.length >= 9) {
    return `+231${digits.substring(1)}`;
  }
  if (digits.length === 8 || digits.length === 9) {
    return `+231${digits}`;
  }
  if (str.trim().startsWith('+')) {
    return `+${digits}`;
  }
  return str.trim();
}

/**
 * Returns user-friendly formatted Liberian phone number (e.g. 0886 123 456 or +231 88 612 3456)
 */
export function formatDisplayPhoneNumber(raw: any): string {
  if (raw === undefined || raw === null) return '';
  const str = typeof raw === 'string' ? raw : String(raw);
  if (!str) return '';
  const normalized = normalizeLiberianPhoneNumber(str);
  if (normalized.startsWith('+231') && normalized.length === 13) {
    const carrier = normalized.substring(4, 6);
    const part1 = normalized.substring(6, 9);
    const part2 = normalized.substring(9, 13);
    return `+231 ${carrier} ${part1} ${part2}`;
  }
  return str;
}

/**
 * Validates whether the number is a valid Liberian mobile carrier number
 * MTN Lonestar: 088, +23188
 * Orange Liberia: 077, +23177
 */
export function isValidLiberianPhoneNumber(raw: any): boolean {
  if (raw === undefined || raw === null) return false;
  const str = typeof raw === 'string' ? raw : String(raw);
  if (!str) return false;
  const digits = str.replace(/[^0-9]/g, '');
  if (digits.startsWith('231') && digits.length === 12) return true;
  if (digits.startsWith('0') && digits.length === 10) return true;
  if (digits.length >= 8 && digits.length <= 15) return true;
  return false;
}

/**
 * Generates Mobile Money USSD string for quick phone dialer
 */
export function generateMomoUssdUri(
  carrier: 'mtn' | 'orange',
  recipientNumber: any,
  amountLrd?: number
): string {
  const str = (recipientNumber !== undefined && recipientNumber !== null) 
    ? (typeof recipientNumber === 'string' ? recipientNumber : String(recipientNumber)) 
    : '';
  const cleanRecipient = str.replace(/[^0-9]/g, '');
  if (carrier === 'mtn') {
    // Lonestar Cell MTN MoMo USSD: *156#
    return amountLrd
      ? `tel:*156*1*1*${cleanRecipient}*${amountLrd}#`
      : `tel:*156#`;
  } else {
    // Orange Money Liberia USSD: *144#
    return amountLrd
      ? `tel:*144*1*1*${cleanRecipient}*${amountLrd}#`
      : `tel:*144#`;
  }
}

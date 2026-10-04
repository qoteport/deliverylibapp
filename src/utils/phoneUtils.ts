/**
 * Liberian Phone Number & MoMo USSD Utilities
 */

/**
 * Normalizes input phone numbers to international standard +231 format
 */
export function normalizeLiberianPhoneNumber(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/[^0-9]/g, '');

  if (digits.startsWith('231')) {
    return `+${digits}`;
  }
  if (digits.startsWith('0') && digits.length >= 9) {
    return `+231${digits.substring(1)}`;
  }
  if (digits.length === 8 || digits.length === 9) {
    return `+231${digits}`;
  }
  if (raw.trim().startsWith('+')) {
    return `+${digits}`;
  }
  return raw.trim();
}

/**
 * Returns user-friendly formatted Liberian phone number (e.g. 0886 123 456 or +231 88 612 3456)
 */
export function formatDisplayPhoneNumber(raw: string): string {
  if (!raw) return '';
  const normalized = normalizeLiberianPhoneNumber(raw);
  if (normalized.startsWith('+231') && normalized.length === 13) {
    const carrier = normalized.substring(4, 6);
    const part1 = normalized.substring(6, 9);
    const part2 = normalized.substring(9, 13);
    return `+231 ${carrier} ${part1} ${part2}`;
  }
  return raw;
}

/**
 * Validates whether the number is a valid Liberian mobile carrier number
 * MTN Lonestar: 088, +23188
 * Orange Liberia: 077, +23177
 */
export function isValidLiberianPhoneNumber(raw: string): boolean {
  if (!raw) return false;
  const digits = raw.replace(/[^0-9]/g, '');
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
  recipientNumber: string,
  amountLrd?: number
): string {
  const cleanRecipient = recipientNumber.replace(/[^0-9]/g, '');
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

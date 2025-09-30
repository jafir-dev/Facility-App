/**
 * Input sanitization utilities to prevent XSS and injection attacks
 */

/**
 * Sanitize text input by removing HTML tags and special characters
 * @param input The text to sanitize
 * @returns Sanitized text
 */
export function sanitizeTextInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');

  // Remove potentially dangerous characters
  sanitized = sanitized.replace(/[<>]/g, '');

  // Remove SQL injection patterns
  sanitized = sanitized.replace(/('|"|;|--|\*|\/\*|\*\/|\\)/g, '');

  // Remove JavaScript patterns
  sanitized = sanitized.replace(/javascript\s*:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Sanitize description field with special handling for line breaks
 * @param input The description to sanitize
 * @returns Sanitized description
 */
export function sanitizeDescription(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // First apply basic text sanitization
  let sanitized = sanitizeTextInput(input);

  // Allow basic line breaks (convert \n to <br> for display)
  sanitized = sanitized.replace(/\n/g, ' ');

  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized;
}

/**
 * Validate and sanitize quote item description
 * @param description The item description to sanitize
 * @param maxLength Maximum allowed length
 * @returns Sanitized description
 */
export function sanitizeQuoteItemDescription(
  description: string,
  maxLength: number = 500,
): string {
  const sanitized = sanitizeDescription(description);

  // Truncate if too long
  if (sanitized.length > maxLength) {
    return sanitized.substring(0, maxLength).trim() + '...';
  }

  return sanitized;
}

/**
 * Sanitize quote description with longer allowed length
 * @param description The quote description to sanitize
 * @param maxLength Maximum allowed length
 * @returns Sanitized description
 */
export function sanitizeQuoteDescription(
  description: string,
  maxLength: number = 2000,
): string {
  const sanitized = sanitizeDescription(description);

  // Truncate if too long
  if (sanitized.length > maxLength) {
    return sanitized.substring(0, maxLength).trim() + '...';
  }

  return sanitized;
}

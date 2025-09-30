/**
 * Decimal precision utilities for financial calculations
 * Prevents floating-point precision errors in monetary calculations
 */

/**
 * Safe decimal multiplication with precision handling
 * @param a First number
 * @param b Second number
 * @returns Precise result rounded to 2 decimal places
 */
export function multiplyDecimal(a: number, b: number): number {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('Both operands must be numbers');
  }

  // Convert to cents to avoid floating-point precision issues
  const result = Math.round(a * 100 * (b * 100)) / 10000;
  return Number(result.toFixed(2));
}

/**
 * Safe decimal addition with precision handling
 * @param numbers Array of numbers to add
 * @returns Precise sum rounded to 2 decimal places
 */
export function sumDecimal(...numbers: number[]): number {
  const validNumbers = numbers.filter(
    (n) => typeof n === 'number' && !isNaN(n),
  );

  if (validNumbers.length === 0) {
    return 0;
  }

  // Sum in cents to avoid floating-point precision issues
  const totalCents = validNumbers.reduce(
    (sum, num) => sum + Math.round(num * 100),
    0,
  );
  const result = totalCents / 100;

  return Number(result.toFixed(2));
}

/**
 * Format decimal for database storage
 * @param value Number to format
 * @returns Number with exactly 2 decimal places
 */
export function formatDecimal(value: number): number {
  if (typeof value !== 'number' || isNaN(value)) {
    return 0;
  }

  return Number(value.toFixed(2));
}

/**
 * Validate decimal value for financial operations
 * @param value Number to validate
 * @param min Minimum allowed value (default: 0)
 * @param max Maximum allowed value (default: 9999999.99)
 * @returns Validated number
 * @throws Error if validation fails
 */
export function validateDecimal(
  value: number,
  min: number = 0,
  max: number = 9999999.99,
): number {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error('Value must be a valid number');
  }

  if (value < min) {
    throw new Error(`Value cannot be less than ${min}`);
  }

  if (value > max) {
    throw new Error(`Value cannot exceed ${max}`);
  }

  // Check for more than 2 decimal places
  const decimalPlaces = value.toString().split('.')[1]?.length || 0;
  if (decimalPlaces > 2) {
    throw new Error('Value cannot have more than 2 decimal places');
  }

  return Number(value.toFixed(2));
}

/**
 * Calculate total cost from material and labor costs
 * @param materialCost Total material cost
 * @param laborCost Total labor cost
 * @returns Precise total cost
 */
export function calculateTotalCost(
  materialCost: number,
  laborCost: number,
): number {
  const validatedMaterial = validateDecimal(materialCost, 0);
  const validatedLabor = validateDecimal(laborCost, 0);

  return sumDecimal(validatedMaterial, validatedLabor);
}

/**
 * Calculate item total cost
 * @param quantity Item quantity
 * @param unitPrice Item unit price
 * @returns Precise item total
 */
export function calculateItemTotal(
  quantity: number,
  unitPrice: number,
): number {
  const validatedQuantity = validateDecimal(quantity, 0);
  const validatedPrice = validateDecimal(unitPrice, 0);

  return multiplyDecimal(validatedQuantity, validatedPrice);
}

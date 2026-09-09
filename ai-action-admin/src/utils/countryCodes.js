/** Dial codes stored on user.countryCode (e.g. +91) */
export const COUNTRY_CODES = [
  { dial: '+91', label: 'India (+91)' },
  { dial: '+1', label: 'US / Canada (+1)' },
  { dial: '+44', label: 'United Kingdom (+44)' },
  { dial: '+971', label: 'UAE (+971)' },
  { dial: '+65', label: 'Singapore (+65)' },
  { dial: '+61', label: 'Australia (+61)' },
  { dial: '+49', label: 'Germany (+49)' },
  { dial: '+33', label: 'France (+33)' },
  { dial: '+966', label: 'Saudi Arabia (+966)' },
  { dial: '+92', label: 'Pakistan (+92)' },
  { dial: '+880', label: 'Bangladesh (+880)' },
  { dial: '+977', label: 'Nepal (+977)' },
  { dial: '+94', label: 'Sri Lanka (+94)' },
  { dial: '+63', label: 'Philippines (+63)' },
  { dial: '+60', label: 'Malaysia (+60)' },
  { dial: '+62', label: 'Indonesia (+62)' },
  { dial: '+66', label: 'Thailand (+66)' },
  { dial: '+81', label: 'Japan (+81)' },
  { dial: '+82', label: 'South Korea (+82)' }
];

export const digitsOnly = (value = '') => String(value).replace(/\D/g, '');

export const normalizeCountryCode = (code = '+91') => {
  const raw = String(code || '+91').trim();
  if (!raw) return '+91';
  const withPlus = raw.startsWith('+') ? raw : `+${raw}`;
  const match = COUNTRY_CODES.find((c) => c.dial === withPlus);
  return match ? match.dial : withPlus;
};

export const validateMobileNumber = (mobile, countryCode = '+91') => {
  const digits = digitsOnly(mobile);
  if (!digits) return 'Mobile number is required';

  const dial = normalizeCountryCode(countryCode);

  if (dial === '+91') {
    if (digits.length !== 10) return 'Enter a valid 10-digit Indian mobile number';
    if (!/^[6-9]/.test(digits)) return 'Indian mobile number must start with 6–9';
    return '';
  }

  if (digits.length < 7 || digits.length > 15) {
    return 'Enter a valid mobile number (7–15 digits)';
  }
  return '';
};

export const validateOptionalMobile = (mobile, countryCode = '+91') => {
  const digits = digitsOnly(mobile);
  if (!digits) return '';
  return validateMobileNumber(digits, countryCode);
};

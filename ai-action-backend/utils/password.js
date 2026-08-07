import bcrypt from 'bcryptjs';

/**
 * Hash a plain text password using bcryptjs
 * @param {string} plainPassword
 * @returns {Promise<string>} Hashed password string
 */
export const hashPassword = async (plainPassword) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(plainPassword, salt);
};

/**
 * Compare a plain text password with a stored hash
 * @param {string} plainPassword
 * @param {string} hashedPassword
 * @returns {Promise<boolean>} True if match, false otherwise
 */
export const comparePassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

export default {
  hashPassword,
  comparePassword
};

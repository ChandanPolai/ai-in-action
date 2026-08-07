import { Admin } from '../models/index.js';
import { hashPassword } from './password.js';

export const seedDefaultAdmin = async () => {
  try {
    const adminEmail = 'admin@gmail.com';
    const existingAdmin = await Admin.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log(`[SEED] Default Admin already exists: (${adminEmail})`);
      return;
    }

    const hashedPassword = await hashPassword('123456');

    const defaultAdmin = new Admin({
      name: 'AI in Action Admin',
      email: adminEmail,
      password: hashedPassword,
      isActive: true
    });

    await defaultAdmin.save();
    console.log(`[SEED SUCCESS] Created default Admin: ${adminEmail} (password: 123456)`);
  } catch (error) {
    console.error('[SEED ERROR] Failed to seed default admin:', error.message);
  }
};

export default seedDefaultAdmin;

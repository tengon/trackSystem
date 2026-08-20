import { db } from '../src/lib/db';
import { hashPassword } from '../src/lib/password';

async function fix() {
  const hashed = hashPassword('password123');
  console.log('Hashed password:', hashed);

  const users = await db.user.findMany();
  for (const u of users) {
    await db.user.update({
      where: { id: u.id },
      data: { password: hashed },
    });
    console.log('Updated:', u.email, '->', hashed.substring(0, 16) + '...');
  }

  // Verify
  const verified = await db.user.findFirst({ where: { email: 'admin@gps.com' } });
  console.log('Verify admin password field:', verified?.password?.substring(0, 16) + '...');
  console.log('Done!');
}

fix().catch(e => { console.error(e); process.exit(1); });

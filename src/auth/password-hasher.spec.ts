import { hashPassword, verifyPassword } from './password-hasher.js';

describe('password hashing', () => {
  it('hashes passwords and verifies them without storing plaintext', async () => {
    const password = 'correct-horse-battery-42';
    const passwordHash = await hashPassword(password);

    expect(passwordHash).not.toBe(password);
    await expect(verifyPassword(password, passwordHash)).resolves.toBe(true);
    await expect(verifyPassword('a-different-password', passwordHash)).resolves.toBe(
      false,
    );
  });

  it('rejects malformed or unsupported password hashes', async () => {
    await expect(verifyPassword('password', 'not-a-valid-hash')).resolves.toBe(
      false,
    );
  });
});

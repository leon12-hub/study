import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const COST = 16_384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const MAX_MEMORY = 64 * 1024 * 1024;
function deriveKey(password, salt) {
    return new Promise((resolve, reject) => {
        scryptCallback(password, salt, KEY_LENGTH, {
            N: COST,
            r: BLOCK_SIZE,
            p: PARALLELIZATION,
            maxmem: MAX_MEMORY,
        }, (error, key) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(key);
        });
    });
}
export async function hashPassword(password) {
    const salt = randomBytes(SALT_LENGTH);
    const key = await deriveKey(password, salt);
    return [
        'scrypt',
        COST,
        BLOCK_SIZE,
        PARALLELIZATION,
        salt.toString('hex'),
        key.toString('hex'),
    ].join('$');
}
export async function verifyPassword(password, storedHash) {
    const [algorithm, cost, blockSize, parallelization, saltHex, keyHex, extra] = storedHash.split('$');
    if (algorithm !== 'scrypt' ||
        cost !== String(COST) ||
        blockSize !== String(BLOCK_SIZE) ||
        parallelization !== String(PARALLELIZATION) ||
        extra !== undefined ||
        !/^[a-f0-9]{32}$/i.test(saltHex ?? '') ||
        !/^[a-f0-9]{128}$/i.test(keyHex ?? '')) {
        return false;
    }
    const salt = Buffer.from(saltHex, 'hex');
    const expectedKey = Buffer.from(keyHex, 'hex');
    const actualKey = await deriveKey(password, salt);
    return timingSafeEqual(actualKey, expectedKey);
}
//# sourceMappingURL=password-hasher.js.map
import { createHash } from 'crypto';

export function hashString(string: string): string {
    const hash = createHash('sha1');
    hash.update(string);
    return hash.digest('hex');
}


import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getAllowedDevOrigins } from './nextDevOrigins';

describe('Next dev origins', () => {
  it('normalizes explicit LAN origins for the Next dev server', () => {
    assert.deepEqual(getAllowedDevOrigins('172.16.3.4, http://192.168.1.12:3000 ,'), [
      '172.16.3.4',
      'http://192.168.1.12:3000',
    ]);
  });
});

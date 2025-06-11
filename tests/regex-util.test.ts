import { escapeRegex } from '../src/utils';

describe('escapeRegex', () => {
  test('allows constructing regex with special characters in field name', () => {
    const fieldName = 'COMPLETE.*';
    expect(() => new RegExp(`${escapeRegex(fieldName)}:\\[\\[([^\\]]*)\\]\\]`, 'g')).not.toThrow();
  });
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPasswordStrongEnough, validatePasswordStrength } from './password';

test('password utils accept letter+number password with min length', () => {
  assert.equal(validatePasswordStrength('Kasir123'), null);
  assert.equal(isPasswordStrongEnough('Kasir123'), true);
});

test('password utils reject password without digits', () => {
  assert.ok(validatePasswordStrength('passwordonly'));
});

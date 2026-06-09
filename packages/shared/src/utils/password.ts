export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_HINT = 'Minimal 8 karakter, kombinasi huruf dan angka.';

export function isPasswordStrongEnough(password: string): boolean {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    /[a-zA-Z]/.test(password) &&
    /\d/.test(password)
  );
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return 'Password minimal 8 karakter.';
  }
  if (!/[a-zA-Z]/.test(password)) {
    return 'Password harus mengandung huruf.';
  }
  if (!/\d/.test(password)) {
    return 'Password harus mengandung angka.';
  }
  return null;
}

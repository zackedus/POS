import type { ValidationErrorDetail } from '@barokah/shared';
import {
  isPasswordStrongEnough,
  isValidIndonesianMobilePhone,
  PASSWORD_HINT,
  RBAC_ROLE_DESCRIPTIONS,
  UserRole,
  validatePasswordStrength,
} from '@barokah/shared';
import { canAssignRole } from '@/lib/rbac';
import { USER_ROLE_LABELS } from '@/lib/users-api';

export { PASSWORD_HINT };

export type UserFormValues = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: string;
  outletIds: string[];
  isActive: boolean;
};

export type UserFormFieldErrors = Partial<Record<keyof UserFormValues | 'form', string>>;

export const STAFF_ROLE_OPTIONS = [
  UserRole.MANAGER,
  UserRole.CASHIER,
  UserRole.ACCOUNTANT,
  UserRole.INVENTORY,
] as const;

export function getAssignableRoleOptions(actorRole: string) {
  return STAFF_ROLE_OPTIONS.filter((role) => canAssignRole(actorRole, role)).map((role) => ({
    value: role,
    label: USER_ROLE_LABELS[role] ?? role,
    description: RBAC_ROLE_DESCRIPTIONS[role],
  }));
}

export function isCashierRole(role: string): boolean {
  return role === UserRole.CASHIER;
}

export function validateIdentityStep(
  values: Pick<UserFormValues, 'fullName' | 'email' | 'phone' | 'password' | 'confirmPassword'>,
  options: { requirePassword: boolean },
): UserFormFieldErrors {
  const errors: UserFormFieldErrors = {};
  const fullName = values.fullName.trim();
  const email = values.email.trim().toLowerCase();
  const phone = values.phone.trim();

  if (fullName.length < 2) {
    errors.fullName = 'Nama lengkap minimal 2 karakter.';
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Email tidak valid.';
  }
  if (phone && !isValidIndonesianMobilePhone(phone)) {
    errors.phone = 'Nomor HP tidak valid. Gunakan format 08…';
  }

  if (options.requirePassword) {
    const passwordError = validatePasswordStrength(values.password);
    if (passwordError) {
      errors.password = passwordError;
    } else if (!isPasswordStrongEnough(values.password)) {
      errors.password = 'Password harus kombinasi huruf dan angka.';
    }
    if (values.password !== values.confirmPassword) {
      errors.confirmPassword = 'Konfirmasi password tidak cocok.';
    }
  } else if (values.password.trim()) {
    const passwordError = validatePasswordStrength(values.password);
    if (passwordError) {
      errors.password = passwordError;
    }
    if (values.password !== values.confirmPassword) {
      errors.confirmPassword = 'Konfirmasi password tidak cocok.';
    }
  }

  return errors;
}

export function validateAccessStep(
  values: Pick<UserFormValues, 'role' | 'outletIds'>,
): UserFormFieldErrors {
  const errors: UserFormFieldErrors = {};

  if (values.outletIds.length === 0) {
    errors.outletIds = 'Pilih minimal satu cabang.';
  } else if (isCashierRole(values.role) && values.outletIds.length !== 1) {
    errors.outletIds = 'Kasir wajib ditetapkan ke tepat satu cabang.';
  }

  return errors;
}

export function mapApiDetailsToFieldErrors(
  details: ValidationErrorDetail[] | undefined,
): UserFormFieldErrors {
  if (!details?.length) return {};
  const errors: UserFormFieldErrors = {};
  for (const detail of details) {
    const field = detail.field as keyof UserFormFieldErrors;
    if (field && !errors[field]) {
      errors[field] = detail.message;
    }
  }
  return errors;
}

export function mapApiFieldToFormField(field: string): keyof UserFormValues | 'form' {
  switch (field) {
    case 'fullName':
    case 'email':
    case 'phone':
    case 'password':
    case 'confirmPassword':
    case 'role':
    case 'outletIds':
    case 'isActive':
      return field;
    default:
      return 'form';
  }
}

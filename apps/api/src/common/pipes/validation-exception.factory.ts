import { UnprocessableEntityException, ValidationError } from '@nestjs/common';
import { ErrorCodes, type ValidationErrorDetail } from '@barokah/shared';

function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): ValidationErrorDetail[] {
  const details: ValidationErrorDetail[] = [];

  for (const error of errors) {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;

    if (error.constraints) {
      for (const [constraint, message] of Object.entries(error.constraints)) {
        details.push({
          field,
          message,
          constraint,
          value: error.value,
        });
      }
    }

    if (error.children?.length) {
      details.push(...flattenValidationErrors(error.children, field));
    }
  }

  return details;
}

export function validationExceptionFactory(errors: ValidationError[]): UnprocessableEntityException {
  const details = flattenValidationErrors(errors);

  return new UnprocessableEntityException({
    code: ErrorCodes.VALIDATION_FAILED,
    message: 'Data yang dikirim tidak valid.',
    details,
  });
}

import type { BundleFormData, FormStep, ValidationErrors } from "./BundleFormTypes";

/**
 * Validates the entire bundle form
 */
export function validateBundleForm(
  formData: BundleFormData,
  steps: FormStep[]
): ValidationErrors {
  const errors: ValidationErrors = {};

  // Validate title
  if (!formData.title.trim()) {
    errors.title = "Title is required";
  }

  // Validate discount
  const discountErrors = validateDiscount(
    formData.discountType,
    formData.discountValue
  );
  if (discountErrors) {
    errors.discountValue = discountErrors;
  }

  // Validate steps
  const stepErrors = validateSteps(steps);
  Object.assign(errors, stepErrors);

  return errors;
}

/**
 * Validates discount settings
 */
export function validateDiscount(
  discountType: string,
  discountValue: string
): string | null {
  const value = parseFloat(discountValue);

  if (!discountValue || value <= 0) {
    return "Discount value must be greater than 0";
  }

  if (discountType === "percentage" && value > 100) {
    return "Percentage cannot be greater than 100";
  }

  return null;
}

/**
 * Validates all bundle steps
 */
export function validateSteps(steps: FormStep[]): ValidationErrors {
  const errors: ValidationErrors = {};

  // Check if at least one step has a title
  const hasValidStep = steps.some(step => step.title.trim());
  if (!hasValidStep) {
    errors.steps = "At least one step with a title is required";
  }

  // Validate each step that has been modified
  steps.forEach((step, index) => {
    const isStepModified = step.title.trim() || step.products.length > 0;
    
    if (isStepModified) {
      const stepErrors = validateStep(step, index);
      Object.assign(errors, stepErrors);
    }
  });

  return errors;
}

/**
 * Validates a single bundle step
 */
export function validateStep(step: FormStep, index: number): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!step.title.trim()) {
    errors[`step_${index}_title`] = "Step title is required";
  }

  if (step.minSelections < 0) {
    errors[`step_${index}_min`] = "Minimum selections cannot be negative";
  }

  if (step.maxSelections !== undefined && step.maxSelections < step.minSelections) {
    errors[`step_${index}_max`] = "Maximum must be greater than or equal to minimum";
  }

  if (step.products.length === 0) {
    errors[`step_${index}_products`] = "At least one product is required";
  }

  return errors;
}

/**
 * Filters validation errors to only show errors for touched fields
 */
export function filterErrorsByTouched(
  errors: ValidationErrors,
  touched: Record<string, boolean>
): ValidationErrors {
  const filtered: ValidationErrors = {};
  
  Object.keys(errors).forEach(key => {
    if (touched[key]) {
      filtered[key] = errors[key];
    }
  });
  
  return filtered;
}

/**
 * Checks if the step has been modified
 */
export function isStepModified(step: FormStep): boolean {
  return step.title.trim() !== "" || step.products.length > 0;
}

/**
 * Creates touched state for all fields when submitting
 */
export function createSubmitTouchedState(steps: FormStep[]): Record<string, boolean> {
  const touched: Record<string, boolean> = {
    title: true,
    discountValue: true,
    steps: true,
  };

  steps.forEach((step, index) => {
    if (isStepModified(step)) {
      touched[`step_${index}_title`] = true;
      touched[`step_${index}_min`] = true;
      touched[`step_${index}_max`] = true;
      touched[`step_${index}_products`] = true;
    }
  });

  return touched;
}
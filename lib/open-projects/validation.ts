import {
  getBudgetValidationMessage,
  getCategoryMinBudgetUsd,
  isOtherCustomCategory,
  isValidCategory,
} from './categories';
import type { CreateProjectInput } from './types';

export function validateProjectBudget(
  category: string | null | undefined,
  budgetMaxUsd: number | null | undefined,
  options: { required?: boolean } = {}
): { valid: true } | { valid: false; error: string } {
  if (budgetMaxUsd == null) {
    if (options.required) {
      return { valid: false, error: 'Project budget is required.' };
    }
    return { valid: true };
  }

  const min = getCategoryMinBudgetUsd(category);
  if (budgetMaxUsd < min) {
    return { valid: false, error: getBudgetValidationMessage(category) };
  }
  return { valid: true };
}

export function validateProjectInput(
  input: Partial<CreateProjectInput>,
  options: { requireBudget?: boolean } = {}
): { valid: true } | { valid: false; error: string } {
  if (input.category !== undefined && input.category !== null && !isValidCategory(input.category)) {
    return { valid: false, error: 'Invalid project category.' };
  }

  if (isOtherCustomCategory(input.category) && options.requireBudget) {
    const custom = input.builder_preferences?.custom_category?.trim();
    if (!custom) {
      return { valid: false, error: 'Please describe your custom project category.' };
    }
  }

  const budgetCheck = validateProjectBudget(input.category, input.budget_max_usd, {
    required: options.requireBudget,
  });
  if (!budgetCheck.valid) return budgetCheck;

  if (
    input.budget_min_usd != null &&
    input.budget_max_usd != null &&
    input.budget_min_usd > input.budget_max_usd
  ) {
    return { valid: false, error: 'Minimum budget cannot exceed maximum budget.' };
  }

  return { valid: true };
}

/** Strip UI-only builder preference fields before persisting. */
export function sanitizeBuilderPreferences(
  prefs: CreateProjectInput['builder_preferences']
): CreateProjectInput['builder_preferences'] {
  if (!prefs) return {};
  const { verified_only: _verifiedOnly, ...rest } = prefs;
  return rest;
}

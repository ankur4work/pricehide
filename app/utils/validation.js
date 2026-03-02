/**
 * Validation utilities for settings and inputs
 */

/**
 * Validate settings data before saving
 */
export function validateSettings(data) {
  const errors = {};

  // Validate custom message
  if (data.customMessage !== undefined) {
    if (typeof data.customMessage !== "string") {
      errors.customMessage = "Custom message must be a string";
    } else if (data.customMessage.length > 200) {
      errors.customMessage = "Custom message must be 200 characters or less";
    } else if (data.customMessage.trim().length === 0 && data.customMessage.length > 0) {
      errors.customMessage = "Custom message cannot be only whitespace";
    }
  }

  // Validate boolean fields
  const booleanFields = [
    "enabled",
    "hideAddToCart",
    "hideOnlyOutOfStock",
    "hideOnProductPage",
    "hideOnCollection",
    "hideOnFeatured",
    "hideOnQuickView",
  ];

  for (const field of booleanFields) {
    if (data[field] !== undefined && typeof data[field] !== "boolean") {
      errors[field] = `${field} must be a boolean`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Sanitize settings data
 */
export function sanitizeSettings(data) {
  return {
    enabled: Boolean(data.enabled),
    hideAddToCart: Boolean(data.hideAddToCart),
    hideOnlyOutOfStock: Boolean(data.hideOnlyOutOfStock),
    customMessage: String(data.customMessage || "").trim().slice(0, 200),
    hideOnProductPage: Boolean(data.hideOnProductPage),
    hideOnCollection: Boolean(data.hideOnCollection),
    hideOnFeatured: Boolean(data.hideOnFeatured),
    hideOnQuickView: Boolean(data.hideOnQuickView),
  };
}

/**
 * Parse form data to settings object
 */
export function parseFormData(formData) {
  return {
    enabled: formData.get("enabled") === "true",
    hideAddToCart: formData.get("hideAddToCart") === "true",
    hideOnlyOutOfStock: formData.get("hideOnlyOutOfStock") === "true",
    customMessage: formData.get("customMessage") || "",
    hideOnProductPage: formData.get("hideOnProductPage") === "true",
    hideOnCollection: formData.get("hideOnCollection") === "true",
    hideOnFeatured: formData.get("hideOnFeatured") === "true",
    hideOnQuickView: formData.get("hideOnQuickView") === "true",
  };
}

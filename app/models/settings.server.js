import prisma from "../db.server";

/**
 * Default settings for new installations
 */
export const DEFAULT_SETTINGS = {
  enabled: true,
  hideAddToCart: true,
  hideOnlyOutOfStock: true,
  customMessage: "Price on Request",
  hideOnProductPage: true,
  hideOnCollection: true,
  hideOnFeatured: true,
  hideOnQuickView: true,
};

/**
 * Get settings for a shop, creating defaults if none exist
 */
export async function getSettings(shop) {
  let settings = await prisma.appSettings.findUnique({
    where: { shop },
  });

  if (!settings) {
    settings = await prisma.appSettings.create({
      data: {
        shop,
        ...DEFAULT_SETTINGS,
      },
    });
  }

  return settings;
}

/**
 * Update settings for a shop
 */
export async function updateSettings(shop, data) {
  const settings = await prisma.appSettings.upsert({
    where: { shop },
    update: {
      enabled: data.enabled ?? DEFAULT_SETTINGS.enabled,
      hideAddToCart: data.hideAddToCart ?? DEFAULT_SETTINGS.hideAddToCart,
      hideOnlyOutOfStock: data.hideOnlyOutOfStock ?? DEFAULT_SETTINGS.hideOnlyOutOfStock,
      customMessage: data.customMessage || DEFAULT_SETTINGS.customMessage,
      hideOnProductPage: data.hideOnProductPage ?? DEFAULT_SETTINGS.hideOnProductPage,
      hideOnCollection: data.hideOnCollection ?? DEFAULT_SETTINGS.hideOnCollection,
      hideOnFeatured: data.hideOnFeatured ?? DEFAULT_SETTINGS.hideOnFeatured,
      hideOnQuickView: data.hideOnQuickView ?? DEFAULT_SETTINGS.hideOnQuickView,
    },
    create: {
      shop,
      enabled: data.enabled ?? DEFAULT_SETTINGS.enabled,
      hideAddToCart: data.hideAddToCart ?? DEFAULT_SETTINGS.hideAddToCart,
      hideOnlyOutOfStock: data.hideOnlyOutOfStock ?? DEFAULT_SETTINGS.hideOnlyOutOfStock,
      customMessage: data.customMessage || DEFAULT_SETTINGS.customMessage,
      hideOnProductPage: data.hideOnProductPage ?? DEFAULT_SETTINGS.hideOnProductPage,
      hideOnCollection: data.hideOnCollection ?? DEFAULT_SETTINGS.hideOnCollection,
      hideOnFeatured: data.hideOnFeatured ?? DEFAULT_SETTINGS.hideOnFeatured,
      hideOnQuickView: data.hideOnQuickView ?? DEFAULT_SETTINGS.hideOnQuickView,
    },
  });

  return settings;
}

/**
 * Delete settings for a shop (used during uninstall)
 */
export async function deleteSettings(shop) {
  try {
    await prisma.appSettings.delete({
      where: { shop },
    });
    return true;
  } catch (error) {
    // Settings may not exist
    return false;
  }
}

/**
 * Get settings as JSON for the theme extension
 */
export async function getSettingsForStorefront(shop) {
  const settings = await getSettings(shop);
  
  return {
    enabled: settings.enabled,
    hideAddToCart: settings.hideAddToCart,
    hideOnlyOutOfStock: settings.hideOnlyOutOfStock,
    customMessage: settings.customMessage,
    hideOnProductPage: settings.hideOnProductPage,
    hideOnCollection: settings.hideOnCollection,
    hideOnFeatured: settings.hideOnFeatured,
    hideOnQuickView: settings.hideOnQuickView,
  };
}

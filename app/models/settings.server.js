import prisma from "../db.server";

/**
 * Default settings for new installations
 */
export const DEFAULT_SETTINGS = {
  enabled: false,
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

/**
 * Sync settings to a shop metafield so the storefront Liquid template can read them.
 * Creates the metafield definition (with storefront access) if it doesn't exist yet.
 */
export async function syncSettingsToStorefront(admin, settings) {
  // 1. Ensure metafield definition exists (idempotent — ignore TAKEN error)
  try {
    await admin.graphql(`
      mutation CreateHidePriceMetafieldDef {
        metafieldDefinitionCreate(definition: {
          name: "Hide Price Config"
          namespace: "xeo_hide_price"
          key: "config"
          type: "json"
          ownerType: SHOP
          access: { storefront: PUBLIC_READ }
        }) {
          createdDefinition { id }
          userErrors { field message code }
        }
      }
    `);
  } catch (_) {
    // Definition may already exist — safe to ignore
  }

  // 2. Get shop GID
  const shopRes = await admin.graphql(`query { shop { id } }`);
  const { data: shopData } = await shopRes.json();
  const shopGid = shopData.shop.id;

  // 3. Write the settings JSON to the metafield
  const value = JSON.stringify({
    enabled: settings.enabled,
    hideAddToCart: settings.hideAddToCart,
    hideOnlyOutOfStock: settings.hideOnlyOutOfStock,
    customMessage: settings.customMessage,
    hideOnProductPage: settings.hideOnProductPage,
    hideOnCollection: settings.hideOnCollection,
    hideOnFeatured: settings.hideOnFeatured,
    hideOnQuickView: settings.hideOnQuickView,
  });

  await admin.graphql(
    `mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id }
        userErrors { field message }
      }
    }`,
    {
      variables: {
        metafields: [{
          ownerId: shopGid,
          namespace: "xeo_hide_price",
          key: "config",
          type: "json",
          value,
        }],
      },
    },
  );
}

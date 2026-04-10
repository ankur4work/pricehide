/**
 * Utility functions for App Bridge interactions
 */

/**
 * Generate the theme editor deep link URL for enabling app embed
 */
export function getThemeEditorUrl(shop, extensionUuid) {
  const cleanShop = shop.replace(".myshopify.com", "");
  return `https://${cleanShop}.myshopify.com/admin/themes/current/editor?context=apps&activateAppId=${extensionUuid}/app-embed`;
}

/**
 * Generate the extensions hub URL
 */
export function getExtensionsHubUrl(shop) {
  const cleanShop = shop.replace(".myshopify.com", "");
  return `https://${cleanShop}.myshopify.com/admin/themes/current/editor?context=apps`;
}

/**
 * Check if the app embed block is enabled in the live theme.
 * Reads settings_data.json via REST Asset API and looks for our extension handle.
 */
export async function checkAppEmbedStatus(session, admin, extensionHandle) {
  try {
    if (!session?.accessToken) {
      console.log("[EmbedCheck] No access token yet, skipping");
      return { isEnabled: false };
    }

    const theme = await getCurrentTheme(admin);
    if (!theme) {
      console.log("[EmbedCheck] Could not get current theme");
      return { isEnabled: false };
    }

    const themeId = theme.id.replace("gid://shopify/OnlineStoreTheme/", "");
    console.log("[EmbedCheck] Checking theme", themeId, theme.name);

    const url = `https://${session.shop}/admin/api/2024-01/themes/${themeId}/assets.json?asset[key]=config/settings_data.json`;
    const res = await fetch(url, {
      headers: { "X-Shopify-Access-Token": session.accessToken },
    });

    if (!res.ok) {
      console.error("[EmbedCheck] REST fetch failed:", res.status);
      return { isEnabled: false };
    }

    const { asset } = await res.json();
    const settingsData = JSON.parse(asset.value);
    const blocks = settingsData?.current?.blocks;

    if (!blocks) {
      console.log("[EmbedCheck] No blocks found in settings_data.json");
      return { isEnabled: false };
    }

    console.log("[EmbedCheck] Found blocks:", Object.keys(blocks).length);

    for (const [key, block] of Object.entries(blocks)) {
      console.log("[EmbedCheck] Block:", key, "type:", block.type, "disabled:", block.disabled);
      if (
        block.type &&
        block.type.includes(extensionHandle) &&
        block.disabled !== true
      ) {
        console.log("[EmbedCheck] ✓ Found enabled embed block");
        return { isEnabled: true };
      }
    }

    console.log("[EmbedCheck] Extension handle '" + extensionHandle + "' not found in any block");
    return { isEnabled: false };
  } catch (error) {
    console.error("[EmbedCheck] Error:", error.message || error);
    return { isEnabled: false };
  }
}

/**
 * Get current theme info
 */
export async function getCurrentTheme(admin) {
  try {
    const response = await admin.graphql(
      `#graphql
        query getMainTheme {
          themes(first: 10, roles: [MAIN]) {
            nodes {
              id
              name
              role
            }
          }
        }
      `
    );

    const data = await response.json();
    const mainTheme = data?.data?.themes?.nodes?.[0];
    
    return mainTheme || null;
  } catch (error) {
    console.error("Error getting current theme:", error);
    return null;
  }
}

/**
 * Validate that the shop domain is properly formatted
 */
export function validateShopDomain(shop) {
  if (!shop) return false;
  const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
  return shopRegex.test(shop);
}

/**
 * Extract shop name from full domain
 */
export function getShopName(shop) {
  return shop.replace(".myshopify.com", "");
}

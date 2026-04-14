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
      return { isEnabled: false };
    }

    const theme = await getCurrentTheme(admin);
    if (!theme) {
      return { isEnabled: false };
    }

    const themeId = theme.id.replace("gid://shopify/OnlineStoreTheme/", "");

    const url = `https://${session.shop}/admin/api/2024-04/themes/${themeId}/assets.json?asset[key]=config/settings_data.json`;
    const res = await fetch(url, {
      headers: { "X-Shopify-Access-Token": session.accessToken },
    });

    if (!res.ok) {
      return { isEnabled: false };
    }

    const { asset } = await res.json();
    const settingsData = JSON.parse(asset.value);
    const blocks = settingsData?.current?.blocks;

    if (!blocks) {
      return { isEnabled: false };
    }

    for (const [key, block] of Object.entries(blocks)) {
      if (
        block.type &&
        block.type.includes(extensionHandle) &&
        block.disabled !== true
      ) {
        return { isEnabled: true };
      }
    }

    return { isEnabled: false };
  } catch (error) {
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

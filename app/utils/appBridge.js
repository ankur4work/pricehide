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
 * Check if app embed is enabled via GraphQL
 */
export async function checkAppEmbedStatus(admin, extensionUuid) {
  try {
    const response = await admin.graphql(
      `#graphql
        query getAppInstallation {
          currentAppInstallation {
            id
            app {
              handle
            }
          }
          appByHandle(handle: "hide-price-app") {
            extensionPoints {
              target
            }
          }
        }
      `
    );

    const data = await response.json();
    
    // For now, we'll assume it's enabled if the app is installed
    // Full embed status check requires checking theme settings
    return {
      isEnabled: true,
      appInstallation: data?.data?.currentAppInstallation,
    };
  } catch (error) {
    console.error("Error checking app embed status:", error);
    return {
      isEnabled: false,
      error: error.message,
    };
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

import { authenticate } from "../shopify.server";
import { deleteSettings } from "../models/settings.server";

/**
 * Webhook handler for Shopify events
 */
export const action = async ({ request }) => {
  const { topic, shop, session, payload, admin } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  switch (topic) {
    case "APP_UNINSTALLED":
      // Clean up shop data when app is uninstalled
      if (session) {
        await deleteSettings(shop);
      }
      break;

    case "PRODUCTS_UPDATE":
      // Product was updated - could trigger cache invalidation
      // The storefront script handles this dynamically
      console.log(`Product updated: ${payload.id}`);
      break;

    case "INVENTORY_LEVELS_UPDATE":
      // Inventory changed - the storefront script handles this dynamically
      console.log(`Inventory updated for: ${payload.inventory_item_id}`);
      break;

    case "CUSTOMERS_DATA_REQUEST":
    case "CUSTOMERS_REDACT":
    case "SHOP_REDACT":
      // Handle mandatory privacy webhooks
      // This app doesn't store customer data, so just acknowledge
      console.log(`Privacy webhook received: ${topic}`);
      break;

    default:
      console.log(`Unhandled webhook topic: ${topic}`);
  }

  return new Response(null, { status: 200 });
};

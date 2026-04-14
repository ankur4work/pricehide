import { authenticate } from "../shopify.server";
import { deleteSettings } from "../models/settings.server";
import prisma from "../db.server";

/**
 * Webhook handler for Shopify events
 */
export const action = async ({ request }) => {
  const { topic, shop, session, payload, admin } = await authenticate.webhook(request);

  switch (topic) {
    case "APP_UNINSTALLED":
      // Clean up ALL shop data when app is uninstalled
      await deleteSettings(shop);
      // Remove all sessions for this shop
      await prisma.session.deleteMany({ where: { shop } });
      break;

    case "PRODUCTS_UPDATE":
    case "INVENTORY_LEVELS_UPDATE":
      // The storefront script handles availability detection dynamically
      break;

    case "CUSTOMERS_DATA_REQUEST":
    case "CUSTOMERS_REDACT":
    case "SHOP_REDACT":
      // This app does not store any customer data — acknowledge only
      break;

    default:
      break;
  }

  return new Response(null, { status: 200 });
};

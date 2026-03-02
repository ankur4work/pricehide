import { json } from "@remix-run/node";
import { cors } from "remix-utils/cors";
import { getSettingsForStorefront } from "../models/settings.server";

/**
 * API endpoint to serve settings to the storefront theme extension
 * This endpoint is called by the hide-price.js script
 */
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return json({ error: "Shop parameter required" }, { status: 400 });
  }

  try {
    const settings = await getSettingsForStorefront(shop);
    
    const response = json({
      success: true,
      settings,
    });

    // Enable CORS for storefront requests
    return cors(request, response, {
      origin: true,
      methods: ["GET"],
      maxAge: 86400,
    });
  } catch (error) {
    console.error("Error fetching storefront settings:", error);
    return json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
};

// Handle OPTIONS preflight requests
export const action = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return cors(request, new Response(null, { status: 204 }), {
      origin: true,
      methods: ["GET"],
      maxAge: 86400,
    });
  }
  return json({ error: "Method not allowed" }, { status: 405 });
};

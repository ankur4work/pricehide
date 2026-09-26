import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  BillingInterval,
  DeliveryMethod,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

// Billing — change these from env vars, no code changes needed
const PLAN_PRICE = parseFloat(process.env.APP_PLAN_PRICE || "30");
export const TRIAL_DAYS = parseInt(process.env.APP_TRIAL_DAYS || "0", 10);

export const PLAN_NAME = process.env.APP_PLAN_NAME || "Pro";

// Annual plan. Billed once a year at a discount vs. 12 x the monthly price.
// Keep PLAN_NAME itself unchanged: billing.check matches on the plan name, so
// renaming it would stop matching existing subscribers and lock them out.
export const ANNUAL_PLAN_NAME =
  process.env.APP_PLAN_ANNUAL_NAME || `${PLAN_NAME} Annual`;
const ANNUAL_PLAN_PRICE = parseFloat(process.env.APP_PLAN_ANNUAL_PRICE || "300");

export const PLAN_CURRENCY = process.env.APP_PLAN_CURRENCY || "USD";
export const PLAN_PRICES = { monthly: PLAN_PRICE, annual: ANNUAL_PLAN_PRICE };
export const ALL_PLAN_NAMES = [PLAN_NAME, ANNUAL_PLAN_NAME];

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.April24,
  scopes: process.env.SCOPES?.split(",") || [
    "read_products",
    "read_inventory",
    "read_themes",
  ],
  appUrl: process.env.SHOPIFY_APP_URL || process.env.HOST || "https://localhost",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  billing: {
    [PLAN_NAME]: {
      amount: PLAN_PRICE,
      currencyCode: PLAN_CURRENCY,
      interval: BillingInterval.Every30Days,
      trialDays: TRIAL_DAYS,
    },
    // Must be registered here too — billing.request/check only accept plans
    // that exist in this config, so a missing entry throws at subscribe time.
    [ANNUAL_PLAN_NAME]: {
      amount: ANNUAL_PLAN_PRICE,
      currencyCode: PLAN_CURRENCY,
      interval: BillingInterval.Annual,
      trialDays: TRIAL_DAYS,
    },
  },
  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks",
    },
    PRODUCTS_UPDATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks",
    },
    INVENTORY_LEVELS_UPDATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks",
    },
  },
  hooks: {
    afterAuth: async ({ session }) => {
      shopify.registerWebhooks({ session });
    },
  },
  future: {
    v3_webhookAdminContext: true,
    v3_authenticatePublic: true,
    unstable_newEmbeddedAuthStrategy: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.April24;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;

import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { AppProvider as PolarisProvider } from "@shopify/polaris";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import {
  authenticate,
  PLAN_NAME,
  ANNUAL_PLAN_NAME,
  ALL_PLAN_NAMES,
  PLAN_PRICES,
  PLAN_CURRENCY,
  TRIAL_DAYS,
} from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  const { billing } = await authenticate.admin(request);

  // Either plan grants access, so check both.
  const { hasActivePayment } = await billing.check({
    plans: ALL_PLAN_NAMES,
  });

  return json({
    apiKey: process.env.SHOPIFY_API_KEY || "",
    hasActivePayment,
    planName: PLAN_NAME,
    planPrice: String(PLAN_PRICES.monthly),
    annualPlanName: ANNUAL_PLAN_NAME,
    annualPlanPrice: String(PLAN_PRICES.annual),
    planCurrency: PLAN_CURRENCY,
    trialDays: TRIAL_DAYS,
  });
};

export const action = async ({ request }) => {
  const { billing } = await authenticate.admin(request);
  const formData = await request.formData();

  if (formData.get("action") === "subscribe") {
    // "annual" picks the yearly plan; anything else falls back to monthly.
    const plan =
      formData.get("interval") === "annual" ? ANNUAL_PLAN_NAME : PLAN_NAME;
    await billing.request({ plan, isTest: false });
  }

  return null;
};

export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Dashboard
        </Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return (
    <PolarisProvider i18n={{}}>
      {boundary.error(useRouteError())}
    </PolarisProvider>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};

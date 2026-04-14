import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { AppProvider as PolarisProvider } from "@shopify/polaris";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate, PLAN_NAME } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  const { billing } = await authenticate.admin(request);

  const { hasActivePayment } = await billing.check({
    plans: [PLAN_NAME],
  });

  return json({
    apiKey: process.env.SHOPIFY_API_KEY || "",
    hasActivePayment,
    planName: PLAN_NAME,
    planPrice: process.env.APP_PLAN_PRICE || "20",
    planCurrency: process.env.APP_PLAN_CURRENCY || "USD",
  });
};

export const action = async ({ request }) => {
  const { billing } = await authenticate.admin(request);
  const formData = await request.formData();

  if (formData.get("action") === "subscribe") {
    await billing.request({ plan: PLAN_NAME, isTest: false });
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

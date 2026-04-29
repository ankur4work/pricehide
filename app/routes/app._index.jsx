import { useEffect, useCallback } from "react";
import { json } from "@remix-run/node";
import {
  useLoaderData,
  useActionData,
  useNavigation,
  useRouteLoaderData,
  useFetcher,
} from "@remix-run/react";
import {
  Page,
  Layout,
  BlockStack,
  Card,
  Text,
  Banner,
  Divider,
  Box,
  InlineStack,
  Badge,
  Button,
  List,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getSettings, updateSettings, syncSettingsToStorefront } from "../models/settings.server";
import { validateSettings, sanitizeSettings, parseFormData } from "../utils/validation";
import { getCurrentTheme, checkAppEmbedStatus } from "../utils/appBridge";
import { SettingsBlock } from "../components/SettingsBlock";
import { SetupStepsBlock } from "../components/SetupStepsBlock";

const APP_HANDLE = "xeo-hide-price";

export const loader = async ({ request }) => {
  try {
    const { admin, session } = await authenticate.admin(request);
    const { shop } = session;

    const settings = await getSettings(shop);
    const currentTheme = await getCurrentTheme(admin);
    const embedResult = await checkAppEmbedStatus(session, admin, APP_HANDLE);
    const isEmbedEnabled = embedResult.isEnabled;

    return json({
      shop,
      settings,
      currentTheme,
      isEmbedEnabled,
      extensionUuid: APP_HANDLE,
    });
  } catch (error) {
    console.error("Loader error:", error);
    return json({
      shop: "unknown",
      settings: null,
      currentTheme: null,
      isEmbedEnabled: false,
      extensionUuid: APP_HANDLE,
      error: "Failed to load: " + error.message,
    });
  }
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shop } = session;

  const formData = await request.formData();
  const actionType = formData.get("action");

  try {
    switch (actionType) {
      case "saveSettings": {
        const data = parseFormData(formData);

        const validation = validateSettings(data);
        if (!validation.isValid) {
          return json({
            success: false,
            error: "Validation failed",
            errors: validation.errors,
          });
        }

        const sanitizedData = sanitizeSettings(data);
        const updatedSettings = await updateSettings(shop, sanitizedData);

        try {
          await syncSettingsToStorefront(admin, updatedSettings);
        } catch (error) {
          console.error("Failed to sync settings metafield:", error);
        }

        return json({
          success: true,
          settings: updatedSettings,
          message: "Settings saved successfully",
        });
      }

      case "checkEmbed": {
        const currentTheme = await getCurrentTheme(admin);
        const embedCheck = await checkAppEmbedStatus(session, admin, APP_HANDLE);

        return json({
          success: true,
          embedStatus: embedCheck.isEnabled,
          currentTheme,
        });
      }

      default:
        return json({
          success: false,
          error: "Unknown action",
        });
    }
  } catch (error) {
    console.error("Action error:", error);
    return json({
      success: false,
      error: error.message || "An error occurred",
    });
  }
};

/**
 * Plan Selection Page — shown when merchant has no active subscription
 */
function PlanSelectionPage({ planName, planPrice, planCurrency, trialDays }) {
  const fetcher = useFetcher();
  const isSubscribing = fetcher.state === "submitting";

  return (
    <Page>
      <TitleBar title="Xeo Hide Price" />
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="400">
            <BlockStack gap="200">
              <Text variant="headingXl" as="h1" alignment="center">
                Choose Your Plan
              </Text>
              <Text variant="bodyLg" tone="subdued" alignment="center">
                Subscribe to start hiding prices on your store
              </Text>
              {trialDays > 0 && (
                <Text variant="bodyLg" tone="success" alignment="center" fontWeight="semibold">
                  {trialDays}-day free trial — no charge until trial ends
                </Text>
              )}
            </BlockStack>
          </BlockStack>
        </Card>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <Text variant="headingLg" as="h2">
                      {planName}
                    </Text>
                    <Text variant="bodyMd" tone="subdued">
                      Full access to all features
                    </Text>
                  </BlockStack>
                  <BlockStack gap="100">
                    <Text variant="headingXl" as="p" alignment="end">
                      ${planPrice}
                    </Text>
                    <Text variant="bodySm" tone="subdued" alignment="end">
                      {planCurrency} / month
                    </Text>
                  </BlockStack>
                </InlineStack>

                <Divider />

                <Text variant="headingSm" as="h3">
                  Everything included:
                </Text>
                <List>
                  <List.Item>Automatically hide prices for out-of-stock products</List.Item>
                  <List.Item>Hide Add to Cart button</List.Item>
                  <List.Item>Custom replacement message</List.Item>
                  <List.Item>Works on product pages, collections, featured sections</List.Item>
                  <List.Item>Quick view modal support</List.Item>
                  <List.Item>Real-time inventory detection</List.Item>
                  <List.Item>Theme-agnostic — works with any Shopify theme</List.Item>
                </List>

                <fetcher.Form method="post" action="/app">
                  <input type="hidden" name="action" value="subscribe" />
                  <Button
                    variant="primary"
                    size="large"
                    fullWidth
                    submit
                    loading={isSubscribing}
                  >
                    {trialDays > 0
                      ? `Start ${trialDays}-day free trial — then $${planPrice}/month`
                      : `Subscribe — $${planPrice}/month`}
                  </Button>
                </fetcher.Form>

                <Text variant="bodySm" tone="subdued" alignment="center">
                  {trialDays > 0
                    ? `${trialDays}-day free trial, then $${planPrice}/${planCurrency} per month. Cancel anytime.`
                    : "You can cancel anytime from your Shopify admin"}
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h2">
                  Why Xeo Hide Price?
                </Text>
                <Divider />
                <BlockStack gap="200">
                  <Text variant="bodyMd" tone="subdued">
                    Stop showing prices on products you can't sell. When inventory hits zero, the app automatically replaces the price with your custom message.
                  </Text>
                  <Text variant="bodyMd" tone="subdued">
                    Works instantly with any Shopify theme — no code changes needed.
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

/**
 * Main Dashboard Component
 */
export default function Index() {
  const loaderData = useLoaderData();
  const parentData = useRouteLoaderData("routes/app");
  const actionData = useActionData();
  const navigation = useNavigation();

  // Check billing status from parent route
  const hasActivePayment = parentData?.hasActivePayment;
  const planName = parentData?.planName || "Pro";
  const planPrice = parentData?.planPrice || "20";
  const planCurrency = parentData?.planCurrency || "USD";
  const trialDays = parentData?.trialDays ?? 3;

  // If not paid, show plan selection
  if (!hasActivePayment) {
    return (
      <PlanSelectionPage
        planName={planName}
        planPrice={planPrice}
        planCurrency={planCurrency}
        trialDays={trialDays}
      />
    );
  }

  const {
    shop,
    settings: initialSettings,
    currentTheme,
    isEmbedEnabled,
    extensionUuid,
    error: loaderError,
  } = loaderData;

  const settings = actionData?.settings || initialSettings;

  return (
    <Page>
      <TitleBar title="Xeo Hide Price" />

      <BlockStack gap="500">
        {loaderError && (
          <Banner title="Error loading settings" tone="critical">
            <p>{loaderError}</p>
          </Banner>
        )}

        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="100">
                <Text variant="headingLg" as="h1">
                  Hide Price When Out of Stock
                </Text>
                <Text variant="bodyMd" tone="subdued">
                  Automatically hide product prices when inventory reaches zero
                </Text>
              </BlockStack>
              <Badge tone={isEmbedEnabled ? "success" : "attention"}>
                {isEmbedEnabled ? "Active" : "Embed not enabled"}
              </Badge>
            </InlineStack>
          </BlockStack>
        </Card>

        <Layout>
          <Layout.Section>
            <BlockStack gap="500">
              <SetupStepsBlock
                shopDomain={shop}
                extensionUuid={extensionUuid}
                isEmbedEnabled={isEmbedEnabled}
                currentTheme={currentTheme}
                settings={settings}
              />
              <SettingsBlock settings={settings} shopDomain={shop} />
            </BlockStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h2">Quick Help</Text>
                  <Divider />
                  <BlockStack gap="200">
                    <Text variant="bodyMd" fontWeight="semibold">How it works</Text>
                    <Text variant="bodyMd" tone="subdued">
                      When a product's inventory reaches zero, the app automatically:
                    </Text>
                    <Box paddingInlineStart="400">
                      <BlockStack gap="100">
                        <Text variant="bodyMd" tone="subdued">• Hides the price display</Text>
                        <Text variant="bodyMd" tone="subdued">• Shows your custom message</Text>
                        <Text variant="bodyMd" tone="subdued">• Optionally hides Add to Cart</Text>
                      </BlockStack>
                    </Box>
                  </BlockStack>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h2">Supported Locations</Text>
                  <Divider />
                  <BlockStack gap="100">
                    <InlineStack gap="200">
                      <Badge tone="info">Product Pages</Badge>
                      <Badge tone="info">Collections</Badge>
                    </InlineStack>
                    <InlineStack gap="200">
                      <Badge tone="info">Featured Products</Badge>
                      <Badge tone="info">Quick View</Badge>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>

              {settings && (
                <Card>
                  <BlockStack gap="300">
                    <Text variant="headingMd" as="h2">Current Configuration</Text>
                    <Divider />
                    <BlockStack gap="200">
                      <InlineStack align="space-between">
                        <Text variant="bodyMd">Hide Cart Button</Text>
                        <Badge tone={settings.hideAddToCart ? "success" : "attention"}>
                          {settings.hideAddToCart ? "Yes" : "No"}
                        </Badge>
                      </InlineStack>
                      <InlineStack align="space-between">
                        <Text variant="bodyMd">Out of Stock Only</Text>
                        <Badge tone={settings.hideOnlyOutOfStock ? "success" : "attention"}>
                          {settings.hideOnlyOutOfStock ? "Yes" : "No"}
                        </Badge>
                      </InlineStack>
                      <Divider />
                      <BlockStack gap="100">
                        <Text variant="bodyMd" fontWeight="semibold">Custom Message:</Text>
                        <Box padding="200" background="bg-surface-secondary" borderRadius="100">
                          <Text variant="bodyMd" tone="subdued">
                            "{settings.customMessage}"
                          </Text>
                        </Box>
                      </BlockStack>
                    </BlockStack>
                  </BlockStack>
                </Card>
              )}

              <Card>
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h2">Need Help?</Text>
                  <Divider />
                  <BlockStack gap="200">
                    <Text variant="bodyMd" tone="subdued">
                      For support, reach out via the app listing page on the Shopify App Store.
                    </Text>
                  </BlockStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

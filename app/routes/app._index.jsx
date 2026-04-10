import { useEffect, useCallback } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  BlockStack,
  Card,
  Text,
  Banner,
  Link,
  Divider,
  Box,
  InlineStack,
  Badge,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getSettings, updateSettings, syncSettingsToStorefront } from "../models/settings.server";
import { validateSettings, sanitizeSettings, parseFormData } from "../utils/validation";
import { getCurrentTheme, checkAppEmbedStatus } from "../utils/appBridge";
import { SettingsBlock } from "../components/SettingsBlock";
import { SetupStepsBlock } from "../components/SetupStepsBlock";

// App handle used in theme block type strings (shopify://apps/{handle}/blocks/...)
const APP_HANDLE = "xeo-hide-price";

/**
 * Loader - fetches settings and shop data
 */
export const loader = async ({ request }) => {
  try {
    const { admin, session } = await authenticate.admin(request);
    const { shop } = session;

    // Get app settings
    const settings = await getSettings(shop);

    // Get current theme info
    const currentTheme = await getCurrentTheme(admin);

    // Check if the app embed is enabled in the live theme
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

/**
 * Action - handles form submissions
 */
export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shop } = session;

  const formData = await request.formData();
  const actionType = formData.get("action");

  try {
    switch (actionType) {
      case "saveSettings": {
        const data = parseFormData(formData);
        
        // Validate input
        const validation = validateSettings(data);
        if (!validation.isValid) {
          return json({
            success: false,
            error: "Validation failed",
            errors: validation.errors,
          });
        }

        // Sanitize and save
        const sanitizedData = sanitizeSettings(data);
        const updatedSettings = await updateSettings(shop, sanitizedData);

        // Sync to storefront metafield so Liquid can read the latest settings
        try {
          await syncSettingsToStorefront(admin, updatedSettings);
        } catch (error) {
          console.error("Failed to sync settings metafield:", error);
          // Don't fail the save — DB is already updated
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
 * Main Dashboard Component
 */
export default function Index() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();

  const { 
    shop, 
    settings: initialSettings, 
    currentTheme,
    isEmbedEnabled,
    extensionUuid,
    error: loaderError,
  } = loaderData;

  // Use updated settings from action if available
  const settings = actionData?.settings || initialSettings;

  const isLoading = navigation.state === "loading";

  return (
    <Page>
      <TitleBar title="Xeo Hide Price" />
      
      <BlockStack gap="500">
        {/* Error Banner */}
        {loaderError && (
          <Banner
            title="Error loading settings"
            tone="critical"
          >
            <p>{loaderError}</p>
          </Banner>
        )}

        {/* Header Section */}
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
          {/* Main Content */}
          <Layout.Section>
            <BlockStack gap="500">
              {/* Setup Steps */}
              <SetupStepsBlock
                shopDomain={shop}
                extensionUuid={extensionUuid}
                isEmbedEnabled={isEmbedEnabled}
                currentTheme={currentTheme}
                settings={settings}
              />

              {/* Settings */}
              <SettingsBlock
                settings={settings}
                shopDomain={shop}
              />
            </BlockStack>
          </Layout.Section>

          {/* Sidebar */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              {/* Quick Help */}
              <Card>
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h2">
                    Quick Help
                  </Text>
                  <Divider />
                  <BlockStack gap="200">
                    <Text variant="bodyMd" fontWeight="semibold">
                      How it works
                    </Text>
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

              {/* Supported Locations */}
              <Card>
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h2">
                    Supported Locations
                  </Text>
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

              {/* Current Settings Summary */}
              {settings && (
                <Card>
                  <BlockStack gap="300">
                    <Text variant="headingMd" as="h2">
                      Current Configuration
                    </Text>
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
                        <Text variant="bodyMd" fontWeight="semibold">
                          Custom Message:
                        </Text>
                        <Box
                          padding="200"
                          background="bg-surface-secondary"
                          borderRadius="100"
                        >
                          <Text variant="bodyMd" tone="subdued">
                            "{settings.customMessage}"
                          </Text>
                        </Box>
                      </BlockStack>
                    </BlockStack>
                  </BlockStack>
                </Card>
              )}

              {/* Support Links */}
              <Card>
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h2">
                    Need Help?
                  </Text>
                  <Divider />
                  <BlockStack gap="200">
                    <Link url="https://help.shopify.com" target="_blank">
                      Shopify Help Center
                    </Link>
                    <Link url="mailto:support@example.com" target="_blank">
                      Contact Support
                    </Link>
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

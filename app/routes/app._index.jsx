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
import { getSettings, updateSettings } from "../models/settings.server";
import { validateSettings, sanitizeSettings, parseFormData } from "../utils/validation";
import { getCurrentTheme } from "../utils/appBridge";
import { SettingsBlock } from "../components/SettingsBlock";
import { SetupStepsBlock } from "../components/SetupStepsBlock";

// Extension UUID - replace with your actual extension UUID after creating the extension
const EXTENSION_UUID = "hide-price-extension";

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

    // For demo purposes, we assume embed is enabled
    // In production, you would check the actual theme settings
    const isEmbedEnabled = true;

    return json({
      shop,
      settings,
      currentTheme,
      isEmbedEnabled,
      extensionUuid: EXTENSION_UUID,
    });
  } catch (error) {
    console.error("Loader error:", error);
    return json({
      shop: "unknown",
      settings: null,
      currentTheme: null,
      isEmbedEnabled: false,
      extensionUuid: EXTENSION_UUID,
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

        return json({
          success: true,
          settings: updatedSettings,
          message: "Settings saved successfully",
        });
      }

      case "checkEmbed": {
        // In production, you would check the actual theme settings via API
        // For now, we return a simulated response
        const currentTheme = await getCurrentTheme(admin);
        
        return json({
          success: true,
          embedStatus: true, // Would be actual check in production
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
              <Badge tone={settings?.enabled ? "success" : "attention"}>
                {settings?.enabled ? "Active" : "Disabled"}
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
                        <Text variant="bodyMd">Status</Text>
                        <Badge tone={settings.enabled ? "success" : "attention"}>
                          {settings.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </InlineStack>
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
                    <Link url="https://help.shopify.com" external>
                      Shopify Help Center
                    </Link>
                    <Link url="mailto:support@example.com" external>
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

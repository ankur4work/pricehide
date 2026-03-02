import { useState, useCallback, useEffect } from "react";
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Banner,
  Icon,
  Box,
  Divider,
  ProgressBar,
  List,
  Collapsible,
  Link,
} from "@shopify/polaris";
import {
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalIcon,
} from "@shopify/polaris-icons";
import { useFetcher } from "@remix-run/react";

/**
 * SetupStepsBlock Component
 * Guides users through app setup and embed verification
 */
export function SetupStepsBlock({ 
  shopDomain, 
  extensionUuid,
  isEmbedEnabled = false,
  currentTheme = null,
}) {
  const fetcher = useFetcher();
  
  const [expandedStep, setExpandedStep] = useState(null);
  const [localEmbedStatus, setLocalEmbedStatus] = useState(isEmbedEnabled);

  // Update local state when prop changes
  useEffect(() => {
    setLocalEmbedStatus(isEmbedEnabled);
  }, [isEmbedEnabled]);

  // Handle fetcher response for embed check
  useEffect(() => {
    if (fetcher.data?.embedStatus !== undefined) {
      setLocalEmbedStatus(fetcher.data.embedStatus);
    }
  }, [fetcher.data]);

  // Check embed status
  const handleCheckEmbed = useCallback(() => {
    const formData = new FormData();
    formData.append("action", "checkEmbed");
    fetcher.submit(formData, { method: "POST" });
  }, [fetcher]);

  // Generate theme editor URL for App Bridge redirect
  const getThemeEditorUrl = useCallback(() => {
    const cleanShop = shopDomain?.replace(".myshopify.com", "") || "";
    return `https://${cleanShop}.myshopify.com/admin/themes/current/editor?context=apps&activateAppId=${extensionUuid}/app-embed`;
  }, [shopDomain, extensionUuid]);

  // Toggle step expansion
  const toggleStep = useCallback((step) => {
    setExpandedStep((current) => (current === step ? null : step));
  }, []);

  // Calculate setup progress
  const steps = [
    { id: "install", label: "App Installed", completed: true },
    { id: "embed", label: "Theme Embed Enabled", completed: localEmbedStatus },
    { id: "configure", label: "Settings Configured", completed: true }, // Assume configured after install
  ];

  const completedSteps = steps.filter((s) => s.completed).length;
  const progress = (completedSteps / steps.length) * 100;

  const isChecking = fetcher.state === "submitting" && fetcher.formData?.get("action") === "checkEmbed";

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text variant="headingMd" as="h2">
            Setup Progress
          </Text>
          <Text variant="bodyMd" tone="subdued">
            {completedSteps} of {steps.length} steps completed
          </Text>
        </InlineStack>

        <ProgressBar progress={progress} tone="primary" size="small" />

        <BlockStack gap="300">
          {/* Step 1: Installation */}
          <Card>
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <InlineStack gap="200" blockAlign="center">
                  <Icon
                    source={CheckCircleIcon}
                    tone="success"
                  />
                  <Text variant="bodyMd" fontWeight="semibold">
                    1. App Installed
                  </Text>
                </InlineStack>
                <Button
                  variant="plain"
                  onClick={() => toggleStep("install")}
                  icon={expandedStep === "install" ? ChevronUpIcon : ChevronDownIcon}
                  accessibilityLabel="Toggle installation details"
                />
              </InlineStack>
              
              <Collapsible open={expandedStep === "install"}>
                <Box paddingBlockStart="200" paddingInlineStart="600">
                  <Text variant="bodyMd" tone="subdued">
                    The Hide Price app has been successfully installed on your store.
                    Your store domain: <strong>{shopDomain}</strong>
                  </Text>
                </Box>
              </Collapsible>
            </BlockStack>
          </Card>

          {/* Step 2: Theme Embed */}
          <Card>
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <InlineStack gap="200" blockAlign="center">
                  <Icon
                    source={localEmbedStatus ? CheckCircleIcon : XCircleIcon}
                    tone={localEmbedStatus ? "success" : "critical"}
                  />
                  <Text variant="bodyMd" fontWeight="semibold">
                    2. Enable Theme Embed
                  </Text>
                </InlineStack>
                <Button
                  variant="plain"
                  onClick={() => toggleStep("embed")}
                  icon={expandedStep === "embed" ? ChevronUpIcon : ChevronDownIcon}
                  accessibilityLabel="Toggle embed details"
                />
              </InlineStack>
              
              <Collapsible open={expandedStep === "embed"}>
                <Box paddingBlockStart="200" paddingInlineStart="600">
                  <BlockStack gap="300">
                    {!localEmbedStatus && (
                      <Banner
                        title="Action Required"
                        tone="warning"
                      >
                        <p>
                          The app embed must be enabled in your theme for prices to be hidden on your storefront.
                        </p>
                      </Banner>
                    )}
                    
                    <Text variant="bodyMd" tone="subdued">
                      {localEmbedStatus 
                        ? "The app embed is enabled and prices will be hidden according to your settings."
                        : "Enable the app embed in your theme to activate price hiding on your storefront."
                      }
                    </Text>

                    {currentTheme && (
                      <Text variant="bodyMd" tone="subdued">
                        Current theme: <strong>{currentTheme.name}</strong>
                      </Text>
                    )}

                    <InlineStack gap="300">
                      <Button
                        url={getThemeEditorUrl()}
                        external
                        icon={ExternalIcon}
                        variant={localEmbedStatus ? "secondary" : "primary"}
                      >
                        {localEmbedStatus ? "Edit Theme Settings" : "Enable App Embed"}
                      </Button>
                      
                      <Button
                        onClick={handleCheckEmbed}
                        loading={isChecking}
                        variant="secondary"
                      >
                        Verify Status
                      </Button>
                    </InlineStack>

                    <Divider />

                    <Text variant="headingSm" as="h3">
                      How to enable:
                    </Text>
                    <List type="number">
                      <List.Item>Click "Enable App Embed" button above</List.Item>
                      <List.Item>In the theme editor, find "Hide Price App" in the App embeds section</List.Item>
                      <List.Item>Toggle it ON</List.Item>
                      <List.Item>Click "Save" in the theme editor</List.Item>
                      <List.Item>Return here and click "Verify Status"</List.Item>
                    </List>
                  </BlockStack>
                </Box>
              </Collapsible>
            </BlockStack>
          </Card>

          {/* Step 3: Configuration */}
          <Card>
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <InlineStack gap="200" blockAlign="center">
                  <Icon
                    source={CheckCircleIcon}
                    tone="success"
                  />
                  <Text variant="bodyMd" fontWeight="semibold">
                    3. Configure Settings
                  </Text>
                </InlineStack>
                <Button
                  variant="plain"
                  onClick={() => toggleStep("configure")}
                  icon={expandedStep === "configure" ? ChevronUpIcon : ChevronDownIcon}
                  accessibilityLabel="Toggle configuration details"
                />
              </InlineStack>
              
              <Collapsible open={expandedStep === "configure"}>
                <Box paddingBlockStart="200" paddingInlineStart="600">
                  <BlockStack gap="200">
                    <Text variant="bodyMd" tone="subdued">
                      Use the settings panel below to customize how prices are hidden:
                    </Text>
                    <List>
                      <List.Item>Choose when to hide prices (out of stock only or always)</List.Item>
                      <List.Item>Customize the replacement message</List.Item>
                      <List.Item>Select which pages to apply price hiding</List.Item>
                      <List.Item>Optionally hide the Add to Cart button</List.Item>
                    </List>
                  </BlockStack>
                </Box>
              </Collapsible>
            </BlockStack>
          </Card>
        </BlockStack>

        {/* Quick Status Summary */}
        {progress === 100 && (
          <Banner
            title="Setup Complete!"
            tone="success"
          >
            <p>
              Your Hide Price app is fully configured and active. Prices will be hidden according to your settings.
            </p>
          </Banner>
        )}
      </BlockStack>
    </Card>
  );
}

export default SetupStepsBlock;

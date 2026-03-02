import { useState, useCallback, useEffect } from "react";
import {
  Card,
  FormLayout,
  TextField,
  Checkbox,
  Button,
  Banner,
  BlockStack,
  InlineStack,
  Text,
  Divider,
  Box,
  Badge,
} from "@shopify/polaris";
import { useFetcher } from "@remix-run/react";

/**
 * SettingsBlock Component
 * Polaris-based settings UI for the Hide Price app
 */
export function SettingsBlock({ settings, shopDomain }) {
  const fetcher = useFetcher();
  
  // Local state for form fields
  const [formState, setFormState] = useState({
    enabled: settings?.enabled ?? true,
    hideAddToCart: settings?.hideAddToCart ?? true,
    hideOnlyOutOfStock: settings?.hideOnlyOutOfStock ?? true,
    customMessage: settings?.customMessage ?? "Price on Request",
    hideOnProductPage: settings?.hideOnProductPage ?? true,
    hideOnCollection: settings?.hideOnCollection ?? true,
    hideOnFeatured: settings?.hideOnFeatured ?? true,
    hideOnQuickView: settings?.hideOnQuickView ?? true,
  });

  // Track if form has been modified
  const [isDirty, setIsDirty] = useState(false);
  
  // Success/error banner state
  const [showBanner, setShowBanner] = useState(false);
  const [bannerContent, setBannerContent] = useState({ status: "success", message: "" });

  // Update local state when settings prop changes
  useEffect(() => {
    if (settings) {
      setFormState({
        enabled: settings.enabled ?? true,
        hideAddToCart: settings.hideAddToCart ?? true,
        hideOnlyOutOfStock: settings.hideOnlyOutOfStock ?? true,
        customMessage: settings.customMessage ?? "Price on Request",
        hideOnProductPage: settings.hideOnProductPage ?? true,
        hideOnCollection: settings.hideOnCollection ?? true,
        hideOnFeatured: settings.hideOnFeatured ?? true,
        hideOnQuickView: settings.hideOnQuickView ?? true,
      });
      setIsDirty(false);
    }
  }, [settings]);

  // Handle fetcher response
  useEffect(() => {
    if (fetcher.data?.success) {
      setBannerContent({
        status: "success",
        message: "Settings saved successfully!",
      });
      setShowBanner(true);
      setIsDirty(false);
      
      // Auto-hide banner after 3 seconds
      const timer = setTimeout(() => setShowBanner(false), 3000);
      return () => clearTimeout(timer);
    } else if (fetcher.data?.error) {
      setBannerContent({
        status: "critical",
        message: fetcher.data.error,
      });
      setShowBanner(true);
    }
  }, [fetcher.data]);

  // Handle field changes
  const handleChange = useCallback((field) => (value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(() => {
    const formData = new FormData();
    formData.append("action", "saveSettings");
    formData.append("enabled", formState.enabled.toString());
    formData.append("hideAddToCart", formState.hideAddToCart.toString());
    formData.append("hideOnlyOutOfStock", formState.hideOnlyOutOfStock.toString());
    formData.append("customMessage", formState.customMessage);
    formData.append("hideOnProductPage", formState.hideOnProductPage.toString());
    formData.append("hideOnCollection", formState.hideOnCollection.toString());
    formData.append("hideOnFeatured", formState.hideOnFeatured.toString());
    formData.append("hideOnQuickView", formState.hideOnQuickView.toString());

    fetcher.submit(formData, { method: "POST" });
  }, [fetcher, formState]);

  // Reset to defaults
  const handleReset = useCallback(() => {
    setFormState({
      enabled: true,
      hideAddToCart: true,
      hideOnlyOutOfStock: true,
      customMessage: "Price on Request",
      hideOnProductPage: true,
      hideOnCollection: true,
      hideOnFeatured: true,
      hideOnQuickView: true,
    });
    setIsDirty(true);
  }, []);

  const isSubmitting = fetcher.state === "submitting";

  return (
    <BlockStack gap="400">
      {showBanner && (
        <Banner
          title={bannerContent.message}
          status={bannerContent.status}
          onDismiss={() => setShowBanner(false)}
        />
      )}

      {/* Main Enable/Disable Toggle */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <BlockStack gap="100">
              <Text variant="headingMd" as="h2">
                App Status
              </Text>
              <Text variant="bodyMd" tone="subdued">
                Enable or disable the price hiding functionality
              </Text>
            </BlockStack>
            <Badge tone={formState.enabled ? "success" : "attention"}>
              {formState.enabled ? "Active" : "Disabled"}
            </Badge>
          </InlineStack>
          
          <Checkbox
            label="Enable Hide Price App"
            checked={formState.enabled}
            onChange={handleChange("enabled")}
            helpText="When enabled, prices will be hidden based on your settings below"
          />
        </BlockStack>
      </Card>

      {/* Behavior Settings */}
      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h2">
            Behavior Settings
          </Text>
          
          <FormLayout>
            <Checkbox
              label="Hide only when out of stock"
              checked={formState.hideOnlyOutOfStock}
              onChange={handleChange("hideOnlyOutOfStock")}
              helpText="When checked, prices are hidden only for products with zero inventory. When unchecked, all prices are hidden."
              disabled={!formState.enabled}
            />
            
            <Checkbox
              label="Hide Add to Cart button"
              checked={formState.hideAddToCart}
              onChange={handleChange("hideAddToCart")}
              helpText="Also hide the Add to Cart button for out-of-stock products"
              disabled={!formState.enabled}
            />
            
            <TextField
              label="Custom message"
              value={formState.customMessage}
              onChange={handleChange("customMessage")}
              placeholder="Price on Request"
              helpText="This message will be displayed instead of the price (max 200 characters)"
              maxLength={200}
              showCharacterCount
              disabled={!formState.enabled}
              autoComplete="off"
            />
          </FormLayout>
        </BlockStack>
      </Card>

      {/* Location Settings */}
      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h2">
            Where to Hide Prices
          </Text>
          <Text variant="bodyMd" tone="subdued">
            Choose where the price hiding should apply
          </Text>
          
          <FormLayout>
            <Checkbox
              label="Product pages"
              checked={formState.hideOnProductPage}
              onChange={handleChange("hideOnProductPage")}
              helpText="Hide prices on individual product pages"
              disabled={!formState.enabled}
            />
            
            <Checkbox
              label="Collection pages"
              checked={formState.hideOnCollection}
              onChange={handleChange("hideOnCollection")}
              helpText="Hide prices on collection grid cards"
              disabled={!formState.enabled}
            />
            
            <Checkbox
              label="Featured product sections"
              checked={formState.hideOnFeatured}
              onChange={handleChange("hideOnFeatured")}
              helpText="Hide prices in featured product blocks and homepage sections"
              disabled={!formState.enabled}
            />
            
            <Checkbox
              label="Quick view modals"
              checked={formState.hideOnQuickView}
              onChange={handleChange("hideOnQuickView")}
              helpText="Hide prices in quick view/quick shop popups"
              disabled={!formState.enabled}
            />
          </FormLayout>
        </BlockStack>
      </Card>

      {/* Save Actions */}
      <Card>
        <InlineStack align="space-between">
          <Button onClick={handleReset} disabled={isSubmitting}>
            Reset to Defaults
          </Button>
          <InlineStack gap="300">
            {isDirty && (
              <Text variant="bodyMd" tone="subdued">
                Unsaved changes
              </Text>
            )}
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={isSubmitting}
              disabled={!isDirty}
            >
              Save Settings
            </Button>
          </InlineStack>
        </InlineStack>
      </Card>
    </BlockStack>
  );
}

export default SettingsBlock;

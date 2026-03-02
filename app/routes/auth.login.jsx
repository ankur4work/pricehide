import { json } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import {
  Page,
  Card,
  FormLayout,
  TextField,
  Button,
  Text,
  BlockStack,
} from "@shopify/polaris";
import { useState } from "react";
import { login } from "../shopify.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const errors = {};

  if (url.searchParams.get("shop_error")) {
    errors.shop = "Please enter a valid shop domain";
  }

  return json({ errors, polarisTranslations: {} });
};

export const action = async ({ request }) => {
  const formData = await request.formData();
  const shop = formData.get("shop");

  const errors = {};
  if (!shop) {
    errors.shop = "Shop domain is required";
    return json({ errors });
  }

  return login(request);
};

export default function Auth() {
  const { errors } = useLoaderData();
  const [shop, setShop] = useState("");

  return (
    <Page narrowWidth>
      <Card>
        <BlockStack gap="400">
          <Text variant="headingLg" as="h1">
            Log in
          </Text>
          <Text variant="bodyMd" as="p">
            Enter your shop domain to log in or install the app.
          </Text>
          <Form method="post">
            <FormLayout>
              <TextField
                type="text"
                name="shop"
                label="Shop domain"
                placeholder="my-shop.myshopify.com"
                value={shop}
                onChange={setShop}
                autoComplete="on"
                error={errors?.shop}
              />
              <Button submit variant="primary">
                Log in
              </Button>
            </FormLayout>
          </Form>
        </BlockStack>
      </Card>
    </Page>
  );
}

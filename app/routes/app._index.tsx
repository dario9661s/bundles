import { Page, Layout, Card, BlockStack, Text, Button, InlineStack, Box } from "@shopify/polaris";
import { useNavigate } from "@remix-run/react";

export default function Index() {
  const navigate = useNavigate();

  return (
    <Page title="Welcome to Bundle Manager">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">
                Create Powerful Product Bundles
              </Text>
              <Text as="p" variant="bodyMd">
                Increase your average order value by offering attractive product bundles with custom discounts.
              </Text>
              <InlineStack gap="300">
                <Button primary onClick={() => navigate("/app/bundles")}>
                  View Bundles
                </Button>
                <Button onClick={() => navigate("/app/bundles/create")}>
                  Create Bundle
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingMd">
                Getting Started
              </Text>
              <BlockStack gap="200">
                <Box>
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    1. Create Your First Bundle
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Add products, set discounts, and configure display options.
                  </Text>
                </Box>
                <Box>
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    2. Add to Your Store
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Use our theme app blocks to display bundles on your storefront.
                  </Text>
                </Box>
                <Box>
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    3. Track Performance
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Monitor bundle performance with built-in analytics.
                  </Text>
                </Box>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
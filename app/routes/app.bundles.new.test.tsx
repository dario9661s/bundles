import { Page, Layout, Card, Text } from "@shopify/polaris";

export default function TestNewBundlePage() {
  return (
    <Page
      title="Test - Create New Bundle"
      breadcrumbs={[{ content: "Bundles", url: "/app/bundles" }]}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <Text as="p">This is a test page for creating a new bundle.</Text>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Bleed,
  BlockStack,
  Card,
  EmptyState,
  Layout,
  Page,
  ResourceItem,
  ResourceList,
  Text,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { useLoaderData } from "@remix-run/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  const mergeConfigurations = await prisma.mergeConfiguration.findMany({
    where: {
      shop,
    },
  });

  return json({ mergeConfigurations });
};

export default function Index() {
  const { mergeConfigurations } = useLoaderData<typeof loader>();

  return (
    <Page
      title={"Mergely - Product Bundler"}
      primaryAction={{
        content: "Add Merge Configuration",
        url: "/app/new",
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap={"200"}>
              <Text as={"h2"} variant={"headingMd"}>
                Merge Configurations
              </Text>

              <Bleed marginInline={"400"} marginBlockEnd={"400"}>
                <div
                  style={
                    {
                      "--p-space-300": "var(--p-space-400)",
                    } as React.CSSProperties
                  }
                >
                  <ResourceList
                    selectable={false}
                    resourceName={{
                      singular: "Merge Configuration",
                      plural: "Merge Configurations",
                    }}
                    emptyState={
                      mergeConfigurations.length === 0 ? (
                        <EmptyState
                          heading="Create your first merge configuration"
                          image="https://cdn.shopify.com/s/files/1/2376/3301/products/emptystate-files.png"
                          action={{
                            content: "Add Merge Configuration",
                            url: "/app/new",
                          }}
                        >
                          <p>
                            Select based on which line item properties cart
                            items should be merged.
                          </p>
                        </EmptyState>
                      ) : undefined
                    }
                    items={mergeConfigurations}
                    renderItem={(mergeConfiguration) => {
                      return (
                        <ResourceItem
                          id={mergeConfiguration.id.toString()}
                          url={`/app/${mergeConfiguration.id}`}
                        >
                          <BlockStack>
                            <Text as={"h3"} variant={"headingMd"}>
                              {mergeConfiguration.title}
                            </Text>
                            <Text
                              as={"span"}
                              variant={"bodyMd"}
                              tone={"subdued"}
                            >
                              Line Item Property:{" "}
                              {mergeConfiguration.lineItemProperty}
                            </Text>
                          </BlockStack>
                        </ResourceItem>
                      );
                    }}
                  />
                </div>
              </Bleed>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant={"oneThird"}>
          <Card>
            <BlockStack gap={"200"}>
              <Text as={"h2"} variant={"headingMd"}>
                Information
              </Text>

              <Text as={"p"} variant={"bodyMd"}>
                There is a limit of 10 total merge configurations. Once you have
                reached that limit, no further merge configurations can be
                added.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

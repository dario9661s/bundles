import {
  BlockStack,
  Box,
  Button,
  Card,
  FormLayout,
  InlineError,
  InlineStack,
  Layout,
  Page,
  Text,
  TextField,
  Thumbnail,
} from "@shopify/polaris";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect, json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import invariant from "tiny-invariant";
import prisma from "~/db.server";
import { useLoaderData, useNavigation, useSubmit } from "@remix-run/react";
import { DeleteIcon, ImageIcon } from "@shopify/polaris-icons";
import { useCallback, useMemo } from "react";
import { Modal, TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { fetchProductVariant } from "~/.server/services/shopify/product-service";
import { refreshMergeConfiguration } from "~/.server/services/data-processing/merge-configuration";

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { shop } = session;

  invariant(
    params.mergeConfigurationId,
    "Expected params.mergeConfigurationId",
  );

  const cartTransform = (
    await prisma.cartTransform.findMany({
      where: { shop },
      orderBy: { id: "desc" },
      take: 1,
    })
  )[0];
  if (!cartTransform) {
    throw new Response(
      "Cart transform not installed. Please contact the developer",
      { status: 500 },
    );
  }

  await prisma.mergeConfiguration.delete({
    where: {
      id: Number(params.mergeConfigurationId),
      shop,
    },
  });

  await refreshMergeConfiguration(shop, cartTransform.cartTransformId, admin);

  return redirect("/app");
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { shop } = session;

  invariant(
    params.mergeConfigurationId,
    "Expected params.mergeConfigurationId",
  );

  const mergeConfiguration = await prisma.mergeConfiguration.findUnique({
    where: {
      id: Number(params.mergeConfigurationId),
      shop,
    },
  });

  if (!mergeConfiguration) {
    throw new Response("Merge configuration not found.", { status: 404 });
  }

  const shopifyVariants = await Promise.all(
    mergeConfiguration.extensionProducts.map((variantId) =>
      fetchProductVariant(variantId, admin),
    ),
  );

  return json({
    mergeConfiguration,
    extensionProductVariants: shopifyVariants,
  });
};

export default function Details() {
  const { mergeConfiguration, extensionProductVariants } =
    useLoaderData<typeof loader>();
  const shopify = useAppBridge();
  const submit = useSubmit();
  const navigation = useNavigation();

  const deleteIsLoading = useMemo(
    () =>
      ["loading", "submitting"].includes(navigation.state) &&
      navigation.formMethod === "POST",
    [navigation.state, navigation.formMethod],
  );

  const handleConfirmDelete = useCallback(() => {
    shopify.modal.show("confirm-delete");
  }, [shopify]);
  const handleDelete = useCallback(() => {
    shopify.modal.hide("confirm-delete");

    submit(
      {},
      {
        method: "post",
        action: `/app/${mergeConfiguration.id}`,
        encType: "application/json",
      },
    );
  }, [shopify, submit, mergeConfiguration]);
  const handleAddThemeExtension = useCallback(() => {
    open(
      "shopify://admin/themes/current/editor?template=product&addAppBlockId=8e0033ab-4834-4047-8042-08a5c144c82a/product_bundle&target=mainSection",
      "_blank",
    );
  }, []);

  return (
    <Page
      title={mergeConfiguration.title}
      backAction={{
        content: "Merge Configurations",
        url: "/app",
      }}
      secondaryActions={[
        {
          content: "Delete",
          destructive: true,
          icon: DeleteIcon,
          loading: deleteIsLoading,
          onAction: handleConfirmDelete,
        },
      ]}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <FormLayout>
              <TextField
                label={"Title"}
                placeholder={"Necklace Bundle"}
                autoComplete={"off"}
                value={mergeConfiguration.title}
                disabled={true}
              />

              <TextField
                label={"Line Item Property"}
                autoComplete={"off"}
                placeholder={"_bundleId"}
                helpText={
                  "Products will be bundled based on their value for this line item property."
                }
                value={mergeConfiguration.lineItemProperty}
                disabled={true}
              />
            </FormLayout>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap={"400"}>
              <Text as={"h2"} variant={"headingMd"}>
                Extension Products
              </Text>

              <Box
                borderColor={"border"}
                borderWidth={"0165"}
                padding={"400"}
                borderRadius={"300"}
              >
                {extensionProductVariants &&
                  extensionProductVariants.length &&
                  extensionProductVariants.map((variant, index) => (
                    <Box key={index} paddingBlock={"200"}>
                      <InlineStack gap={"300"} blockAlign={"center"}>
                        <Thumbnail
                          size={"small"}
                          source={
                            variant.productVariant?.image?.url ??
                            variant.productVariant?.product.media.nodes[0]
                              ?.image?.url ??
                            ImageIcon
                          }
                          alt={`Thumbnail of product ${variant.productVariant?.title}`}
                        />

                        <BlockStack>
                          <Text as={"h3"} variant={"headingMd"}>
                            {variant.productVariant?.product.title}
                          </Text>
                          <Text as={"span"} variant={"bodyMd"} tone={"subdued"}>
                            Variant: {variant.productVariant?.title}
                          </Text>
                        </BlockStack>
                      </InlineStack>
                    </Box>
                  ))}

                {(!extensionProductVariants ||
                  extensionProductVariants.length === 0) && (
                  <InlineError
                    message={
                      "Failed to load extension products. Was the product deleted from shopify? This merge configuration will no longer work."
                    }
                    fieldID={"extensionProducts"}
                  />
                )}
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap={"400"}>
              <Text as={"h2"} variant={"headingMd"}>
                Store Setup
              </Text>

              <Text as={"p"} variant={"bodyMd"}>
                To enable the merge configuration in your store and allow your
                customers to create bundles, add a line item property to your
                cart items. The easiest way is to use our theme extension. Add
                it to your theme by clicking the button below.
              </Text>

              <Box>
                <Button onClick={handleAddThemeExtension}>Edit Theme</Button>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      <Modal id={"confirm-delete"}>
        <Box padding={"400"}>
          <p>
            Are you sure you want to delete the merge configuration{" "}
            <b>{mergeConfiguration.title}</b>? This can't be undone.
          </p>
        </Box>
        <TitleBar title={`Delete ${mergeConfiguration.title}?`}>
          <button variant={"primary"} tone={"critical"} onClick={handleDelete}>
            Delete
          </button>
          <button onClick={() => shopify.modal.hide("confirm-delete")}>
            Cancel
          </button>
        </TitleBar>
      </Modal>
    </Page>
  );
}

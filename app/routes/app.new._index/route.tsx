import {
  Bleed,
  BlockStack,
  Box,
  Button,
  Card,
  FormLayout,
  InlineError,
  InlineStack,
  Layout,
  Page,
  PageActions,
  Text,
  TextField,
  Thumbnail,
} from "@shopify/polaris";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { notEmpty, useField, useForm } from "@shopify/react-form";
import { ImageIcon, PlusCircleIcon } from "@shopify/polaris-icons";
import { useCallback, useMemo, useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import type { Product } from "~/types/shopify";
import prisma from "~/db.server";
import { useNavigation, useSubmit } from "@remix-run/react";
import { getFirstFreeMetafieldKey } from "~/.server/utils/metafield-keys";
import { refreshMergeConfiguration } from "~/.server/services/data-processing/merge-configuration";
import { ensureCartTransformForShop } from "~/.server/services/install/setup";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { shop } = session;
  const data = {
    ...(await request.json()),
    shop,
  };

  const cartTransform = await ensureCartTransformForShop(shop, admin);
  if (!cartTransform) {
    throw new Response(
      "Could not install cart transform. Please contact developer.",
      { status: 500 },
    );
  }

  const existingMergeConfiguration = await prisma.mergeConfiguration.findUnique(
    {
      where: {
        lineItemPropertyUnique: {
          shop,
          lineItemProperty: data.lineItemProperty,
        },
      },
    },
  );

  if (existingMergeConfiguration) {
    throw new Response(
      "Merge configuration with same line item property already exists.",
      { status: 422 },
    );
  }

  const allExistingMergeConfigurations =
    await prisma.mergeConfiguration.findMany({
      where: { shop },
    });

  const metafieldKey = getFirstFreeMetafieldKey(
    allExistingMergeConfigurations.map(
      (configuration) => configuration.metafieldKey,
    ),
  );
  if (!metafieldKey) {
    throw new Response("Reached limit of 10 merge configurations.", {
      status: 400,
    });
  }

  const mergeConfiguration = await prisma.mergeConfiguration.create({
    data: {
      ...data,
      ...{
        metafieldKey,
      },
    },
  });

  await refreshMergeConfiguration(shop, cartTransform.cartTransformId, admin);

  return redirect(`/app/${mergeConfiguration.id}`);
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return null;
};

export default function Create() {
  const shopify = useAppBridge();
  const submit = useSubmit();
  const navigation = useNavigation();

  const [selectedExtensionProducts, setSelectedExtensionProducts] = useState<
    Product[]
  >([]);

  const form = useForm({
    fields: {
      title: useField({
        value: "",
        validates: [notEmpty("The title can not be empty.")],
      }),
      lineItemProperty: useField({
        value: "",
        validates: [notEmpty("The line property can not be empty.")],
      }),
      extensionProducts: useField({
        value: [] as String[],
        validates: [notEmpty("Please select one or more extension products.")],
      }),
    },
    onSubmit: async (fieldValues) => {
      // @ts-expect-error
      submit(fieldValues, { method: "post", encType: "application/json" });

      return { status: "success" };
    },
  });

  const handleOpenResourcePicker = useCallback(async () => {
    const selectedProducts = await shopify.resourcePicker({
      type: "product",
      action: "select",
      multiple: true,
      filter: {
        variants: false,
      },
    });

    const products =
      selectedProducts?.map((product) => product as Product) ?? [];
    const variants = products.map((product) => product.variants[0].id);

    setSelectedExtensionProducts(products);

    form.fields.extensionProducts.onChange(variants);
    form.fields.extensionProducts.runValidation(variants);
  }, [shopify, form]);

  const handleSave = useCallback(async () => {
    console.log("save");
    await form.submit();
  }, [form]);

  const isLoading = useMemo(
    () =>
      ["submitting", "loading"].includes(navigation.state) &&
      navigation.formMethod === "POST",
    [navigation.state, navigation.formMethod],
  );

  return (
    <Page
      title={"Add Merge Configuration"}
      backAction={{
        content: "Merge Configurations",
        url: "/app",
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <FormLayout>
              <TextField
                label={"Title"}
                placeholder={"Necklace Bundle"}
                autoComplete={"off"}
                {...form.fields.title}
              />

              <TextField
                label={"Line Item Property"}
                autoComplete={"off"}
                placeholder={"_bundleId"}
                helpText={
                  "Products will be bundled based on their value for this line item property."
                }
                {...form.fields.lineItemProperty}
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

              {selectedExtensionProducts && (
                <Box
                  borderColor={"border"}
                  borderWidth={"0165"}
                  padding={"400"}
                  borderRadius={"300"}
                >
                  {selectedExtensionProducts.map((extensionProduct) => (
                    <Box key={extensionProduct.id} paddingBlock={"200"}>
                      <InlineStack gap={"300"} blockAlign={"center"}>
                        <Thumbnail
                          size={"small"}
                          source={
                            extensionProduct.variants[0]?.image?.originalSrc ??
                            extensionProduct.images?.[0]?.originalSrc ??
                            ImageIcon
                          }
                          alt={`Thumbnail of product ${extensionProduct.title}`}
                        />

                        <BlockStack>
                          <Text as={"h3"} variant={"headingMd"}>
                            {extensionProduct.title}
                          </Text>
                          <Text as={"span"} variant={"bodyMd"} tone={"subdued"}>
                            Variant: {extensionProduct.variants[0]?.title}
                          </Text>
                        </BlockStack>
                      </InlineStack>
                    </Box>
                  ))}
                </Box>
              )}

              <Bleed marginInlineStart={"200"}>
                <Button
                  variant={"tertiary"}
                  icon={PlusCircleIcon}
                  onClick={handleOpenResourcePicker}
                >
                  Select Extension Products
                </Button>
              </Bleed>

              {form.fields.extensionProducts.error && (
                <InlineError
                  message={form.fields.extensionProducts.error}
                  fieldID={"extensionProducts"}
                />
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <PageActions
            primaryAction={{
              content: "Save",
              onAction: handleSave,
              loading: isLoading,
            }}
          />
        </Layout.Section>
      </Layout>
    </Page>
  );
}

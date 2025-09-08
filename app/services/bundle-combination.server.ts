import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

const COMBINATION_METAOBJECT_TYPE = "bundle_combination";

export interface CombinationMetaobjectField {
  key: string;
  value: string;
}

export interface CombinationMetaobject {
  id: string;
  fields: CombinationMetaobjectField[];
}

export interface BundleCombination {
  id: string;
  products: string[];
  imageUrl: string;
  imageId: string;
  title?: string;
}

interface MetaobjectCreateResponse {
  data: {
    metaobjectCreate: {
      metaobject: CombinationMetaobject | null;
      userErrors: Array<{
        field: string[];
        message: string;
      }>;
    };
  };
}

interface MetaobjectUpdateResponse {
  data: {
    metaobjectUpdate: {
      metaobject: CombinationMetaobject | null;
      userErrors: Array<{
        field: string[];
        message: string;
      }>;
    };
  };
}

interface MetaobjectDeleteResponse {
  data: {
    metaobjectDelete: {
      deletedId: string | null;
      userErrors: Array<{
        field: string[];
        message: string;
      }>;
    };
  };
}

interface MediaCreateResponse {
  data: {
    fileCreate: {
      files: Array<{
        id: string;
        alt?: string;
        createdAt: string;
        fileStatus: string;
        fileErrors: Array<{
          code: string;
          details?: string;
          message: string;
        }>;
        preview?: {
          status: string;
          image?: {
            url: string;
            width: number;
            height: number;
          };
        };
      }>;
      userErrors: Array<{
        field?: string[];
        message: string;
      }>;
    };
  };
}

interface StagedUploadsCreateResponse {
  data: {
    stagedUploadsCreate: {
      stagedTargets: Array<{
        url: string;
        resourceUrl: string;
        parameters: Array<{
          name: string;
          value: string;
        }>;
      }>;
      userErrors: Array<{
        field?: string[];
        message: string;
      }>;
    };
  };
}

interface ProductQueryResponse {
  data: {
    nodes: Array<{
      id: string;
      title: string;
      featuredImage?: {
        url: string;
      };
    }>;
  };
}

interface MetaobjectsQueryResponse {
  data: {
    metaobjects: {
      nodes: CombinationMetaobject[];
    };
  };
}

interface FileQueryResponse {
  data: {
    node: {
      id: string;
      image?: {
        url: string;
      };
    } | null;
  };
}

async function parseFieldValue(field: CombinationMetaobjectField): Promise<any> {
  try {
    return JSON.parse(field.value);
  } catch {
    return field.value;
  }
}

async function getImageUrl(admin: AdminApiContext, imageId: string): Promise<string | null> {
  const query = `
    query GetFile($id: ID!) {
      node(id: $id) {
        ... on MediaImage {
          id
          image {
            url
          }
        }
      }
    }
  `;

  const response = await admin.graphql(query, { variables: { id: imageId } });
  const result = (await response.json()) as FileQueryResponse;

  return result.data.node?.image?.url || null;
}

async function metaobjectToCombination(
  admin: AdminApiContext,
  metaobject: CombinationMetaobject
): Promise<BundleCombination> {
  const fields = metaobject.fields.reduce((acc, field) => {
    acc[field.key] = parseFieldValue(field);
    return acc;
  }, {} as Record<string, any>);

  const imageUrl = await getImageUrl(admin, fields.image);

  return {
    id: metaobject.id,
    products: fields.products || [],
    imageUrl: imageUrl || "",
    imageId: fields.image || "",
    title: fields.title,
  };
}

export async function ensureCombinationDefinitionExists(admin: AdminApiContext) {
  const checkQuery = `
    query {
      metaobjectDefinitionByType(type: "${COMBINATION_METAOBJECT_TYPE}") {
        id
        type
      }
    }
  `;

  const response = await admin.graphql(checkQuery);
  const result = await response.json();

  if (!result.data?.metaobjectDefinitionByType) {
    const createDefinition = `
      mutation CreateCombinationDefinition {
        metaobjectDefinitionCreate(
          definition: {
            type: "${COMBINATION_METAOBJECT_TYPE}"
            displayNameKey: "title"
            fieldDefinitions: [
              { key: "products", type: "list.product_reference", name: "Products", required: true }
              { key: "image", type: "file_reference", name: "Image", required: true, validations: [{ name: "file_type_allow_list", value: "[\"image/jpeg\", \"image/png\", \"image/gif\", \"image/webp\"]" }] }
              { key: "title", type: "single_line_text_field", name: "Title", required: false }
            ]
          }
        ) {
          metaobjectDefinition {
            id
            type
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    await admin.graphql(createDefinition);
  }
}

export async function uploadImageToShopify(
  admin: AdminApiContext,
  imageBase64: string,
  filename?: string
): Promise<{ imageId: string; imageUrl: string }> {
  // Create staged upload
  const stagedUploadMutation = `
    mutation stagedUploadsCreate {
      stagedUploadsCreate(input: {
        resource: FILE,
        filename: "${filename || 'combination-image.png'}",
        mimeType: "image/png",
        fileSize: "${Buffer.from(imageBase64, 'base64').length}"
      }) {
        stagedTargets {
          url
          resourceUrl
          parameters {
            name
            value
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const stagedResponse = await admin.graphql(stagedUploadMutation);
  const stagedResult = (await stagedResponse.json()) as StagedUploadsCreateResponse;

  if (stagedResult.data.stagedUploadsCreate.userErrors.length > 0) {
    throw new Error(
      `Failed to create staged upload: ${stagedResult.data.stagedUploadsCreate.userErrors
        .map((e) => e.message)
        .join(", ")}`
    );
  }

  const target = stagedResult.data.stagedUploadsCreate.stagedTargets[0];
  if (!target) {
    throw new Error("No staged target returned");
  }

  // Upload the file to the staged URL
  const formData = new FormData();
  target.parameters.forEach((param) => {
    formData.append(param.name, param.value);
  });
  formData.append("file", Buffer.from(imageBase64, "base64"));

  const uploadResponse = await fetch(target.url, {
    method: "POST",
    body: formData,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
  }

  // Create file in Shopify
  const createFileMutation = `
    mutation fileCreate($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files {
          id
          alt
          createdAt
          fileStatus
          fileErrors {
            code
            details
            message
          }
          preview {
            status
            image {
              url
              width
              height
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const fileCreateResponse = await admin.graphql(createFileMutation, {
    variables: {
      files: [
        {
          originalSource: target.resourceUrl,
          contentType: "IMAGE",
        },
      ],
    },
  });

  const fileResult = (await fileCreateResponse.json()) as MediaCreateResponse;

  if (fileResult.data.fileCreate.userErrors.length > 0) {
    throw new Error(
      `Failed to create file: ${fileResult.data.fileCreate.userErrors
        .map((e) => e.message)
        .join(", ")}`
    );
  }

  const file = fileResult.data.fileCreate.files[0];
  if (!file) {
    throw new Error("No file created");
  }

  // Wait for file to be processed
  let retries = 0;
  let imageUrl = file.preview?.image?.url;
  
  while (!imageUrl && retries < 10) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const checkQuery = `
      query GetFile($id: ID!) {
        node(id: $id) {
          ... on MediaImage {
            id
            image {
              url
            }
          }
        }
      }
    `;
    
    const checkResponse = await admin.graphql(checkQuery, { variables: { id: file.id } });
    const checkResult = (await checkResponse.json()) as FileQueryResponse;
    
    imageUrl = checkResult.data.node?.image?.url;
    retries++;
  }

  if (!imageUrl) {
    throw new Error("Failed to get image URL after upload");
  }

  return {
    imageId: file.id,
    imageUrl,
  };
}

export async function createCombination(
  admin: AdminApiContext,
  productIds: string[],
  imageBase64: string,
  title?: string
): Promise<{ combination: BundleCombination | null; errors: string[] }> {
  try {
    await ensureCombinationDefinitionExists(admin);

    // Upload image first
    const { imageId, imageUrl } = await uploadImageToShopify(admin, imageBase64);

    // Create metaobject
    const mutation = `
      mutation CreateCombination($metaobject: MetaobjectCreateInput!) {
        metaobjectCreate(metaobject: $metaobject) {
          metaobject {
            id
            fields {
              key
              value
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const fields = [
      { key: "products", value: JSON.stringify(productIds) },
      { key: "image", value: imageId },
    ];

    if (title) {
      fields.push({ key: "title", value: title });
    }

    const variables = {
      metaobject: {
        type: COMBINATION_METAOBJECT_TYPE,
        fields,
      },
    };

    const response = await admin.graphql(mutation, { variables });
    const result = (await response.json()) as MetaobjectCreateResponse;

    if (result.data.metaobjectCreate.userErrors.length > 0) {
      return {
        combination: null,
        errors: result.data.metaobjectCreate.userErrors.map((e) => e.message),
      };
    }

    if (!result.data.metaobjectCreate.metaobject) {
      return {
        combination: null,
        errors: ["Failed to create combination"],
      };
    }

    return {
      combination: {
        id: result.data.metaobjectCreate.metaobject.id,
        products: productIds,
        imageUrl,
        imageId,
        title,
      },
      errors: [],
    };
  } catch (error) {
    console.error("Error creating combination:", error);
    return {
      combination: null,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

export async function updateCombination(
  admin: AdminApiContext,
  combinationId: string,
  updates: { title?: string; imageBase64?: string }
): Promise<{ combination: BundleCombination | null; errors: string[] }> {
  try {
    const fields: Array<{ key: string; value: string }> = [];

    if (updates.title !== undefined) {
      fields.push({ key: "title", value: updates.title });
    }

    if (updates.imageBase64) {
      const { imageId } = await uploadImageToShopify(admin, updates.imageBase64);
      fields.push({ key: "image", value: imageId });
    }

    const mutation = `
      mutation UpdateCombination($id: ID!, $metaobject: MetaobjectUpdateInput!) {
        metaobjectUpdate(id: $id, metaobject: $metaobject) {
          metaobject {
            id
            fields {
              key
              value
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      id: combinationId,
      metaobject: { fields },
    };

    const response = await admin.graphql(mutation, { variables });
    const result = (await response.json()) as MetaobjectUpdateResponse;

    if (result.data.metaobjectUpdate.userErrors.length > 0) {
      return {
        combination: null,
        errors: result.data.metaobjectUpdate.userErrors.map((e) => e.message),
      };
    }

    if (!result.data.metaobjectUpdate.metaobject) {
      return {
        combination: null,
        errors: ["Failed to update combination"],
      };
    }

    const combination = await metaobjectToCombination(
      admin,
      result.data.metaobjectUpdate.metaobject
    );

    return {
      combination,
      errors: [],
    };
  } catch (error) {
    console.error("Error updating combination:", error);
    return {
      combination: null,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

export async function deleteCombination(
  admin: AdminApiContext,
  combinationId: string
): Promise<{ success: boolean; errors: string[] }> {
  const mutation = `
    mutation DeleteCombination($id: ID!) {
      metaobjectDelete(id: $id) {
        deletedId
        userErrors {
          field
          message
        }
      }
    }
  `;

  const response = await admin.graphql(mutation, { variables: { id: combinationId } });
  const result = (await response.json()) as MetaobjectDeleteResponse;

  if (result.data.metaobjectDelete.userErrors.length > 0) {
    return {
      success: false,
      errors: result.data.metaobjectDelete.userErrors.map((e) => e.message),
    };
  }

  return {
    success: !!result.data.metaobjectDelete.deletedId,
    errors: [],
  };
}

export async function getCombinationsByIds(
  admin: AdminApiContext,
  combinationIds: string[]
): Promise<BundleCombination[]> {
  if (combinationIds.length === 0) {
    return [];
  }

  const query = `
    query GetCombinations($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on Metaobject {
          id
          fields {
            key
            value
          }
        }
      }
    }
  `;

  const response = await admin.graphql(query, { variables: { ids: combinationIds } });
  const result = await response.json();

  const combinations: BundleCombination[] = [];
  
  for (const node of result.data.nodes) {
    if (node) {
      const combination = await metaobjectToCombination(admin, node);
      combinations.push(combination);
    }
  }

  return combinations;
}

export async function getCombinationsForBundle(
  admin: AdminApiContext,
  combinationIds: string[]
): Promise<Array<{ id: string; products: Array<{ id: string; title: string; featuredImage?: string }>; imageUrl: string; imageId: string; title?: string }>> {
  if (combinationIds.length === 0) {
    return [];
  }

  const combinations = await getCombinationsByIds(admin, combinationIds);
  
  // Get all unique product IDs
  const allProductIds = new Set<string>();
  combinations.forEach(combo => {
    combo.products.forEach(productId => allProductIds.add(productId));
  });

  // Fetch product details
  const productQuery = `
    query GetProducts($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on Product {
          id
          title
          featuredImage {
            url
          }
        }
      }
    }
  `;

  const productResponse = await admin.graphql(productQuery, { 
    variables: { ids: Array.from(allProductIds) } 
  });
  const productResult = (await productResponse.json()) as ProductQueryResponse;

  // Create product map
  const productMap = new Map<string, { id: string; title: string; featuredImage?: string }>();
  productResult.data.nodes.forEach(product => {
    productMap.set(product.id, {
      id: product.id,
      title: product.title,
      featuredImage: product.featuredImage?.url,
    });
  });

  // Map combinations with product details
  return combinations.map(combo => ({
    id: combo.id,
    products: combo.products
      .map(productId => productMap.get(productId))
      .filter(Boolean) as Array<{ id: string; title: string; featuredImage?: string }>,
    imageUrl: combo.imageUrl,
    imageId: combo.imageId,
    title: combo.title,
  }));
}
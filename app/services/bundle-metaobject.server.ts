import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import type { Bundle, BundleStep, BundleProduct } from "../types/bundle.types";

const METAOBJECT_TYPE = "mergely_bundle";

export interface MetaobjectField {
  key: string;
  value: string;
}

export interface BundleMetaobject {
  id: string;
  handle: string;
  fields: MetaobjectField[];
  createdAt: string;
  updatedAt: string;
}

export interface MetaobjectsResponse {
  data: {
    metaobjects: {
      nodes: BundleMetaobject[];
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
    };
  };
}

export interface MetaobjectResponse {
  data: {
    metaobject: BundleMetaobject | null;
  };
}

export interface CreateMetaobjectResponse {
  data: {
    metaobjectCreate: {
      metaobject: BundleMetaobject | null;
      userErrors: Array<{
        field: string[];
        message: string;
      }>;
    };
  };
}

export interface UpdateMetaobjectResponse {
  data: {
    metaobjectUpdate: {
      metaobject: BundleMetaobject | null;
      userErrors: Array<{
        field: string[];
        message: string;
      }>;
    };
  };
}

export interface DeleteMetaobjectResponse {
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

function parseFieldValue(field: MetaobjectField): any {
  try {
    return JSON.parse(field.value);
  } catch {
    return field.value;
  }
}

function metaobjectToBundle(metaobject: BundleMetaobject): Bundle {
  const fields = metaobject.fields.reduce((acc, field) => {
    acc[field.key] = parseFieldValue(field);
    return acc;
  }, {} as Record<string, any>);

  return {
    id: metaobject.id,
    handle: metaobject.handle,
    title: fields.title || "",
    status: fields.status || "draft",
    discountType: fields.discount_type || "percentage",
    discountValue: parseFloat(fields.discount_value) || 0,
    layoutType: fields.layout_type || "grid",
    mobileColumns: parseInt(fields.mobile_columns) || 2,
    desktopColumns: parseInt(fields.desktop_columns) || 4,
    steps: fields.steps || [],
    createdAt: metaobject.createdAt,
    updatedAt: metaobject.updatedAt,
  };
}

function bundleToFields(bundle: Partial<Bundle>): Array<{ key: string; value: string }> {
  const fields: Array<{ key: string; value: string }> = [];

  if (bundle.title !== undefined) {
    fields.push({ key: "title", value: bundle.title });
  }
  if (bundle.status !== undefined) {
    fields.push({ key: "status", value: bundle.status });
  }
  if (bundle.discountType !== undefined) {
    fields.push({ key: "discount_type", value: bundle.discountType });
  }
  if (bundle.discountValue !== undefined) {
    fields.push({ key: "discount_value", value: bundle.discountValue.toString() });
  }
  if (bundle.layoutType !== undefined) {
    fields.push({ key: "layout_type", value: bundle.layoutType });
  }
  if (bundle.mobileColumns !== undefined) {
    fields.push({ key: "mobile_columns", value: bundle.mobileColumns.toString() });
  }
  if (bundle.desktopColumns !== undefined) {
    fields.push({ key: "desktop_columns", value: bundle.desktopColumns.toString() });
  }
  if (bundle.steps !== undefined) {
    fields.push({ key: "steps", value: JSON.stringify(bundle.steps) });
  }

  return fields;
}

export async function ensureMetaobjectDefinitionExists(admin: AdminApiContext) {
  const checkQuery = `
    query {
      metaobjectDefinitionByType(type: "${METAOBJECT_TYPE}") {
        id
        type
      }
    }
  `;

  const response = await admin.graphql(checkQuery);
  const result = await response.json();

  if (!result.data?.metaobjectDefinitionByType) {
    const createDefinition = `
      mutation CreateBundleDefinition {
        metaobjectDefinitionCreate(
          definition: {
            type: "${METAOBJECT_TYPE}"
            displayNameKey: "title"
            fieldDefinitions: [
              { key: "title", type: "single_line_text_field", name: "Title", required: true }
              { key: "status", type: "single_line_text_field", name: "Status", required: true }
              { key: "discount_type", type: "single_line_text_field", name: "Discount Type", required: true }
              { key: "discount_value", type: "single_line_text_field", name: "Discount Value", required: true }
              { key: "layout_type", type: "single_line_text_field", name: "Layout Type", required: true }
              { key: "mobile_columns", type: "single_line_text_field", name: "Mobile Columns", required: true }
              { key: "desktop_columns", type: "single_line_text_field", name: "Desktop Columns", required: true }
              { key: "steps", type: "json", name: "Steps", required: true }
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

export async function listBundles(
  admin: AdminApiContext,
  page: number = 1,
  limit: number = 20,
  status?: "active" | "inactive" | "draft" | "all"
): Promise<{ bundles: Bundle[]; total: number; hasNext: boolean }> {
  const query = `
    query ListBundles($first: Int!, $after: String) {
      metaobjects(type: "${METAOBJECT_TYPE}", first: $first, after: $after) {
        nodes {
          id
          handle
          fields {
            key
            value
          }
          createdAt
          updatedAt
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  const skip = (page - 1) * limit;
  let allBundles: Bundle[] = [];
  let cursor: string | null = null;
  let hasMore = true;
  let totalFetched = 0;

  while (hasMore && totalFetched < skip + limit) {
    const variables = {
      first: Math.min(250, skip + limit - totalFetched),
      ...(cursor && { after: cursor }),
    };

    const response = await admin.graphql(query, { variables });
    const result = (await response.json()) as MetaobjectsResponse;

    const bundles = result.data.metaobjects.nodes.map(metaobjectToBundle);
    allBundles = allBundles.concat(bundles);

    totalFetched += bundles.length;
    hasMore = result.data.metaobjects.pageInfo.hasNextPage;
    cursor = result.data.metaobjects.pageInfo.endCursor;
  }

  if (status && status !== "all") {
    allBundles = allBundles.filter((bundle) => bundle.status === status);
  }

  const start = skip;
  const end = skip + limit;
  const paginatedBundles = allBundles.slice(start, end);

  return {
    bundles: paginatedBundles,
    total: allBundles.length,
    hasNext: end < allBundles.length,
  };
}

export async function getBundle(admin: AdminApiContext, id: string): Promise<Bundle | null> {
  const query = `
    query GetBundle($id: ID!) {
      metaobject(id: $id) {
        id
        handle
        fields {
          key
          value
        }
        createdAt
        updatedAt
      }
    }
  `;

  const response = await admin.graphql(query, { variables: { id } });
  const result = (await response.json()) as MetaobjectResponse;

  if (!result.data.metaobject) {
    return null;
  }

  return metaobjectToBundle(result.data.metaobject);
}

export async function createBundle(
  admin: AdminApiContext,
  bundleData: Omit<Bundle, "id" | "handle" | "createdAt" | "updatedAt">
): Promise<{ bundle: Bundle | null; errors: string[] }> {
  await ensureMetaobjectDefinitionExists(admin);

  const fields = bundleToFields(bundleData);

  const mutation = `
    mutation CreateBundle($metaobject: MetaobjectCreateInput!) {
      metaobjectCreate(metaobject: $metaobject) {
        metaobject {
          id
          handle
          fields {
            key
            value
          }
          createdAt
          updatedAt
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    metaobject: {
      type: METAOBJECT_TYPE,
      fields,
    },
  };

  const response = await admin.graphql(mutation, { variables });
  const result = (await response.json()) as CreateMetaobjectResponse;

  if (result.data.metaobjectCreate.userErrors.length > 0) {
    return {
      bundle: null,
      errors: result.data.metaobjectCreate.userErrors.map((e) => e.message),
    };
  }

  return {
    bundle: result.data.metaobjectCreate.metaobject
      ? metaobjectToBundle(result.data.metaobjectCreate.metaobject)
      : null,
    errors: [],
  };
}

export async function updateBundle(
  admin: AdminApiContext,
  id: string,
  bundleData: Partial<Omit<Bundle, "id" | "handle" | "createdAt" | "updatedAt">>
): Promise<{ bundle: Bundle | null; errors: string[] }> {
  const fields = bundleToFields(bundleData);

  const mutation = `
    mutation UpdateBundle($id: ID!, $metaobject: MetaobjectUpdateInput!) {
      metaobjectUpdate(id: $id, metaobject: $metaobject) {
        metaobject {
          id
          handle
          fields {
            key
            value
          }
          createdAt
          updatedAt
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    id,
    metaobject: {
      fields,
    },
  };

  const response = await admin.graphql(mutation, { variables });
  const result = (await response.json()) as UpdateMetaobjectResponse;

  if (result.data.metaobjectUpdate.userErrors.length > 0) {
    return {
      bundle: null,
      errors: result.data.metaobjectUpdate.userErrors.map((e) => e.message),
    };
  }

  return {
    bundle: result.data.metaobjectUpdate.metaobject
      ? metaobjectToBundle(result.data.metaobjectUpdate.metaobject)
      : null,
    errors: [],
  };
}

export async function deleteBundle(
  admin: AdminApiContext,
  id: string
): Promise<{ success: boolean; errors: string[] }> {
  const mutation = `
    mutation DeleteBundle($id: ID!) {
      metaobjectDelete(id: $id) {
        deletedId
        userErrors {
          field
          message
        }
      }
    }
  `;

  const response = await admin.graphql(mutation, { variables: { id } });
  const result = (await response.json()) as DeleteMetaobjectResponse;

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
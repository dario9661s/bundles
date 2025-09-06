import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import { Page, Layout, Card, EmptyState, Spinner, Box, BlockStack, Text } from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { BundleForm } from "~/components/BundleForm";
import type { Bundle, UpdateBundleRequest, GetBundleResponse, ErrorResponse } from "~/types/bundle";
import { useCallback, useState, useEffect } from "react";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { id } = params;

  if (!id) {
    throw new Response("Bundle ID is required", { status: 400 });
  }

  try {
    const response = await fetch(`/api/bundles/${id}`);
    const data = await response.json();

    if (!response.ok) {
      const error = data as ErrorResponse;
      if (response.status === 404) {
        throw new Response("Bundle not found", { status: 404 });
      }
      return json(
        { error: error.message || "Failed to load bundle" },
        { status: response.status }
      );
    }

    const bundleData = data as GetBundleResponse;
    return json({ bundle: bundleData.bundle });
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    console.error("Failed to load bundle:", error);
    return json(
      { error: "Failed to load bundle. Please try again." },
      { status: 500 }
    );
  }
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { id } = params;

  if (!id) {
    return json({ error: "Bundle ID is required" }, { status: 400 });
  }
  
  try {
    const formData = await request.formData();
    const action = formData.get("_action");

    if (action === "delete") {
      const response = await fetch(`/api/bundles/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        return json(
          { error: data.message || "Failed to delete bundle" },
          { status: response.status }
        );
      }

      return redirect("/app/bundles");
    }

    // Update action
    const bundleData = JSON.parse(formData.get("data") as string) as UpdateBundleRequest;

    const response = await fetch(`/api/bundles/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bundleData),
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data as ErrorResponse;
      return json(
        { error: error.message || "Failed to update bundle" },
        { status: response.status }
      );
    }

    return json({ success: true });
  } catch (error) {
    console.error("Failed to update bundle:", error);
    return json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
};

export default function EditBundlePage() {
  const data = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const isSubmitting = navigation.state !== "idle";

  if ("error" in data) {
    return (
      <Page
        title="Edit Bundle"
        breadcrumbs={[{ content: "Bundles", url: "/app/bundles" }]}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <EmptyState
                heading="Error loading bundle"
                image=""
              >
                <p>{data.error}</p>
              </EmptyState>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const { bundle } = data;

  const handleSubmit = useCallback(async (data: UpdateBundleRequest) => {
    const formData = new FormData();
    formData.append("data", JSON.stringify(data));
    submit(formData, { method: "post" });
  }, [submit]);

  const handleDelete = useCallback(() => {
    if (window.confirm(`Are you sure you want to delete "${bundle.title}"? This action cannot be undone.`)) {
      const formData = new FormData();
      formData.append("_action", "delete");
      submit(formData, { method: "post" });
    }
  }, [submit, bundle.title]);

  const handleCancel = useCallback(() => {
    window.history.back();
  }, []);

  return (
    <Page
      title={`Edit ${bundle.title}`}
      breadcrumbs={[{ content: "Bundles", url: "/app/bundles" }]}
      secondaryActions={[
        {
          content: "Delete",
          destructive: true,
          onAction: handleDelete,
        },
      ]}
    >
      <Layout>
        <Layout.Section>
          <BundleForm
            bundle={bundle}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export function ErrorBoundary() {
  return (
    <Page
      title="Bundle Not Found"
      breadcrumbs={[{ content: "Bundles", url: "/app/bundles" }]}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <EmptyState
              heading="Bundle not found"
              action={{ content: "View all bundles", url: "/app/bundles" }}
              image=""
            >
              <p>The bundle you're looking for doesn't exist or has been deleted.</p>
            </EmptyState>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
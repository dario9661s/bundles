import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useNavigate, useSubmit, useNavigation, Link } from "@remix-run/react";
import { Page, Layout, Button, BlockStack } from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { BundleList } from "~/components/BundleList";
import type { Bundle, ListBundlesResponse, ErrorResponse } from "~/types/bundle";
import { useState, useCallback, useEffect } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const status = url.searchParams.get("status") || "all";

  try {
    const response = await fetch(`/api/bundles?page=${page}&limit=${limit}&status=${status}`);
    const data: ListBundlesResponse | ErrorResponse = await response.json();
    
    if ('error' in data) {
      return json({
        bundles: [],
        pagination: { page: 1, limit: 20, total: 0, hasNext: false },
        error: data.message,
      });
    }

    return json(data);
  } catch (error) {
    console.error("Failed to load bundles:", error);
    return json({
      bundles: [],
      pagination: { page: 1, limit: 20, total: 0, hasNext: false },
      error: "Failed to load bundles. Please try again.",
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  const formData = await request.formData();
  const action = formData.get("action");
  const bundleId = formData.get("bundleId") as string;

  try {
    if (action === "delete") {
      const response = await fetch(`/api/bundles/${bundleId}`, { method: "DELETE" });
      const data = await response.json();
      
      if (!response.ok) {
        return json({ error: data.message || "Failed to delete bundle" }, { status: response.status });
      }
      
      return json({ success: true });
    }

    if (action === "toggleStatus") {
      const newStatus = formData.get("status") as Bundle['status'];
      const response = await fetch(`/api/bundles/${bundleId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json();
      
      if (!response.ok) {
        return json({ error: data.message || "Failed to update bundle status" }, { status: response.status });
      }
      
      return json({ success: true });
    }

    return json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Action failed:", error);
    return json({ error: "Operation failed. Please try again." }, { status: 500 });
  }
};

export default function BundlesPage() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [error, setError] = useState<string | undefined>(undefined);

  const isLoading = navigation.state !== "idle";

  useEffect(() => {
    if ("error" in data && data.error) {
      setError(data.error);
    }
  }, [data]);

  const handleEdit = useCallback((bundleId: string) => {
    navigate(`/app/bundles/${bundleId}`);
  }, [navigate]);

  const handleDelete = useCallback(async (bundleId: string) => {
    const formData = new FormData();
    formData.append("action", "delete");
    formData.append("bundleId", bundleId);
    submit(formData, { method: "post" });
  }, [submit]);

  const handleStatusToggle = useCallback(async (bundleId: string, status: Bundle['status']) => {
    const formData = new FormData();
    formData.append("action", "toggleStatus");
    formData.append("bundleId", bundleId);
    formData.append("status", status);
    submit(formData, { method: "post" });
  }, [submit]);

  return (
    <Page
      title="Product Bundles"
      primaryAction={{
        content: "Create bundle",
        onAction: () => {
          console.log("Create bundle clicked");
          window.location.href = "/app/bundles/new";
        },
      }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {"bundles" in data && (
              <BundleList
                bundles={data.bundles}
                pagination={data.pagination}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStatusToggle={handleStatusToggle}
                loading={isLoading}
                error={error}
              />
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
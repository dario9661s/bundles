import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigate, useActionData } from "@remix-run/react";
import { Page, Layout, Card, EmptyState, Modal, TextField, Select, FormLayout, Box, InlineError } from "@shopify/polaris";
import { ArrowLeftIcon } from "@shopify/polaris-icons";
import { authenticate } from "~/shopify.server";
import { BundleDetail } from "~/components/BundleDetail";
import { getBundle, deleteBundle, duplicateBundle } from "~/services/bundle-metaobject.server";
import type { Bundle } from "~/types/bundle";
import { useCallback, useState, useEffect } from "react";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const { id } = params;

  if (!id) {
    throw new Response("Bundle ID is required", { status: 400 });
  }

  // Decode the ID in case it's URL-encoded
  const decodedId = decodeURIComponent(id);

  try {
    const bundle = await getBundle(admin, decodedId);
    
    if (!bundle) {
      throw new Response("Bundle not found", { status: 404 });
    }

    return json({ bundle });
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
  const { admin } = await authenticate.admin(request);
  const { id } = params;

  if (!id) {
    return json({ error: "Bundle ID is required" }, { status: 400 });
  }
  
  // Decode the ID in case it's URL-encoded
  const decodedId = decodeURIComponent(id);
  
  try {
    const formData = await request.formData();
    const action = formData.get("_action");

    if (action === "delete") {
      const result = await deleteBundle(admin, decodedId);

      if (!result.success) {
        return json(
          { error: result.errors.join(", ") || "Failed to delete bundle" },
          { status: 400 }
        );
      }

      return redirect("/app/bundles");
    }

    if (action === "duplicate") {
      const title = formData.get("title") as string;
      const status = formData.get("status") as "active" | "draft" | undefined;
      
      const result = await duplicateBundle(admin, decodedId, title, status || "draft");
      
      if (!result.bundle) {
        return json({ error: result.errors.join(", ") || "Failed to duplicate bundle" }, { status: 400 });
      }
      
      return json({ duplicatedBundleId: result.bundle.id });
    }

    return json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to process action:", error);
    return json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
};

export default function BundleDetailPage() {
  const { bundle } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigate = useNavigate();
  const [duplicating, setDuplicating] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateTitle, setDuplicateTitle] = useState("");
  const [duplicateStatus, setDuplicateStatus] = useState<"active" | "draft">("draft");
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  // Handle successful duplication
  useEffect(() => {
    if (actionData && 'duplicatedBundleId' in actionData) {
      navigate(`/app/bundles/${encodeURIComponent(actionData.duplicatedBundleId)}`);
    }
    if (actionData && 'error' in actionData) {
      setDuplicateError(actionData.error);
      setDuplicating(false);
    }
  }, [actionData, navigate]);

  const handleEdit = useCallback(() => {
    navigate(`/app/bundles/${encodeURIComponent(bundle.id)}/edit`);
  }, [navigate, bundle.id]);


  const handleDuplicateClick = useCallback(() => {
    setDuplicateTitle(`${bundle.title} - Copy`);
    setDuplicateStatus("draft");
    setDuplicateError(null);
    setDuplicateModalOpen(true);
  }, [bundle.title]);

  const handleDuplicateConfirm = useCallback(() => {
    if (!duplicateTitle.trim()) {
      setDuplicateError("Title is required");
      return;
    }
    
    setDuplicating(true);
    setDuplicateError(null);
    
    const formData = new FormData();
    formData.append("_action", "duplicate");
    formData.append("title", duplicateTitle);
    formData.append("status", duplicateStatus);
    
    submit(formData, { 
      method: "post",
      navigate: false,
    });
  }, [submit, duplicateTitle, duplicateStatus]);

  const handleDuplicateCancel = useCallback(() => {
    setDuplicateModalOpen(false);
    setDuplicateTitle("");
    setDuplicateError(null);
  }, []);

  return (
    <>
      <Page
        backAction={{content: "Bundles", url: "/app/bundles"}}
        title={bundle.title}
        primaryAction={{
          content: "Edit bundle",
          onAction: handleEdit,
        }}
        secondaryActions={[
          {
            content: "Duplicate",
            onAction: handleDuplicateClick,
            loading: duplicating,
          },
        ]}
      >
        <Layout>
          <Layout.Section>
            <BundleDetail
              bundle={bundle}
              onEdit={handleEdit}
              onDelete={() => {}}
              onDuplicate={handleDuplicateClick}
            />
          </Layout.Section>
        </Layout>
      </Page>

      <Modal
        open={duplicateModalOpen}
        onClose={handleDuplicateCancel}
        title="Duplicate Bundle"
        primaryAction={{
          content: "Duplicate",
          onAction: handleDuplicateConfirm,
          loading: duplicating,
          disabled: duplicating || !duplicateTitle.trim(),
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: handleDuplicateCancel,
            disabled: duplicating,
          },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            {duplicateError && (
              <Box paddingBlockEnd="400">
                <InlineError message={duplicateError} />
              </Box>
            )}
            
            <TextField
              label="Bundle title"
              value={duplicateTitle}
              onChange={setDuplicateTitle}
              autoComplete="off"
              error={!duplicateTitle.trim() ? "Title is required" : undefined}
              helpText="Enter a unique title for the duplicated bundle"
              requiredIndicator
              disabled={duplicating}
            />
            
            <Select
              label="Status"
              options={[
                { label: "Draft", value: "draft" },
                { label: "Active", value: "active" },
              ]}
              value={duplicateStatus}
              onChange={(value) => setDuplicateStatus(value as "active" | "draft")}
              helpText="Choose the initial status for the duplicated bundle"
              disabled={duplicating}
            />
          </FormLayout>
        </Modal.Section>
      </Modal>

    </>
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
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useNavigate, useActionData } from "@remix-run/react";
import { Page, Layout, Card, EmptyState, Banner, Modal, FormLayout, TextField, Box, InlineError, Badge, Select } from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { BundleForm } from "~/components/BundleForm";
import { BundleSummary } from "~/components/BundleSummary";
import { getBundle, updateBundle, deleteBundle, duplicateBundle } from "~/services/bundle-metaobject.server";
import type { Bundle, UpdateBundleRequest } from "~/types/bundle";
import { useCallback, useState, useEffect } from "react";
import "~/styles/bundle-layout.css";

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
    throw new Response("Failed to load bundle", { status: 500 });
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
        return json({ error: result.errors.join(", ") || "Failed to delete bundle" }, { status: 400 });
      }
      return redirect("/app/bundles");
    }
    
    if (action === "updateStatus") {
      const newStatus = formData.get("status") as Bundle['status'];
      const result = await updateBundle(admin, decodedId, { status: newStatus });
      
      if (!result.bundle) {
        return json({ error: result.errors.join(", ") || "Failed to update bundle status" }, { status: 400 });
      }
      
      // Return the updated bundle data to refresh the UI
      return json({ 
        success: true, 
        message: `Bundle status updated to ${newStatus}`,
        bundle: result.bundle 
      });
    }
    
    if (action === "duplicate") {
      const title = formData.get("title") as string;
      const status = formData.get("status") as "active" | "draft" | undefined;
      
      const result = await duplicateBundle(admin, decodedId, title, status || "draft");
      
      if (!result.bundle) {
        return json({ error: result.errors.join(", ") || "Failed to duplicate bundle" }, { status: 400 });
      }
      
      return redirect(`/app/bundles/${encodeURIComponent(result.bundle.id)}/edit`);
    }
    
    // Regular form submission
    const bundleData = JSON.parse(formData.get("data") as string) as UpdateBundleRequest;
    const result = await updateBundle(admin, decodedId, bundleData);

    if (!result.bundle) {
      return json(
        { error: result.errors.join(", ") || "Failed to update bundle" },
        { status: 400 }
      );
    }

    // Redirect to the detail view after successful update
    return redirect(`/app/bundles/${encodeURIComponent(decodedId)}`);
  } catch (error) {
    console.error("Failed to process action:", error);
    return json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
};

export default function EditBundlePage() {
  const { bundle } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const navigate = useNavigate();
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateTitle, setDuplicateTitle] = useState("");
  const [duplicateStatus, setDuplicateStatus] = useState<"active" | "draft">("draft");
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [currentStatus, setCurrentStatus] = useState(bundle.status);
  const [isStatusChanging, setIsStatusChanging] = useState(false);
  const [formState, setFormState] = useState<{
    title: string;
    status: Bundle['status'];
    layoutType: Bundle['layoutType'];
    discountType: Bundle['discountType'];
    discountValue: number;
    steps: any[];
    isValid: boolean;
  }>({
    title: bundle.title,
    status: bundle.status,
    layoutType: bundle.layoutType,
    discountType: bundle.discountType,
    discountValue: bundle.discountValue,
    steps: bundle.steps || [],
    isValid: true,
  });
  
  // Update current status when bundle changes (e.g., after navigation)
  useEffect(() => {
    setCurrentStatus(bundle.status);
  }, [bundle.status]);
  
  const isSubmitting = navigation.state !== "idle";
  const isDeleting = isSubmitting && navigation.formData?.get("_action") === "delete";
  const isDuplicating = isSubmitting && navigation.formData?.get("_action") === "duplicate";
  
  // Handle success messages from actions
  useEffect(() => {
    if (actionData && "success" in actionData && actionData.success) {
      setSuccessMessage(actionData.message || "Action completed successfully");
      setShowSuccessBanner(true);
      // Update status from response if bundle data is returned
      if (actionData.bundle) {
        setCurrentStatus(actionData.bundle.status);
      }
      setIsStatusChanging(false);
      setTimeout(() => setShowSuccessBanner(false), 3000);
    }
    if (actionData && "error" in actionData) {
      setIsStatusChanging(false);
    }
  }, [actionData]);

  const handleSubmit = useCallback(async (data: UpdateBundleRequest) => {
    const formData = new FormData();
    formData.append("data", JSON.stringify(data));
    submit(formData, { method: "post" });
  }, [submit]);

  const handleCancel = useCallback(() => {
    navigate(`/app/bundles/${encodeURIComponent(bundle.id)}`);
  }, [navigate, bundle.id]);
  
  const handleStatusChange = useCallback((newStatus: string) => {
    if (newStatus === currentStatus) return;
    
    setIsStatusChanging(true);
    const formData = new FormData();
    formData.append("_action", "updateStatus");
    formData.append("status", newStatus);
    submit(formData, { method: "post" });
  }, [submit, currentStatus]);
  
  const handleDelete = useCallback(() => {
    setDeleteModalOpen(true);
  }, []);
  
  const confirmDelete = useCallback(() => {
    const formData = new FormData();
    formData.append("_action", "delete");
    submit(formData, { method: "post" });
  }, [submit]);
  
  const handleDuplicate = useCallback(() => {
    setDuplicateTitle(`${bundle.title} - Copy`);
    setDuplicateStatus("draft");
    setDuplicateModalOpen(true);
  }, [bundle.title]);
  
  const confirmDuplicate = useCallback(() => {
    const formData = new FormData();
    formData.append("_action", "duplicate");
    formData.append("title", duplicateTitle);
    formData.append("status", duplicateStatus);
    submit(formData, { method: "post" });
  }, [submit, duplicateTitle, duplicateStatus]);

  // Determine secondary actions
  const secondaryActions = [
    {
      content: "Duplicate",
      onAction: handleDuplicate,
      loading: isDuplicating,
    },
    {
      content: "Delete",
      destructive: true,
      onAction: handleDelete,
      loading: isDeleting,
    },
  ];

  return (
    <>
      <Page
        backAction={{content: bundle.title, url: `/app/bundles/${encodeURIComponent(bundle.id)}`}}
        title="Edit bundle"
        titleMetadata={
          <Box minWidth="150px">
            <Select
              label=""
              labelHidden
              options={[
                { label: "Active", value: "active" },
                { label: "Draft", value: "draft" },
                { label: "Inactive", value: "inactive" },
              ]}
              value={currentStatus}
              onChange={handleStatusChange}
              disabled={isStatusChanging}
            />
          </Box>
        }
        secondaryActions={secondaryActions}
      >
        <Layout>
          {showSuccessBanner && (
            <Layout.Section>
              <Banner
                status="success"
                onDismiss={() => setShowSuccessBanner(false)}
              >
                {successMessage}
              </Banner>
            </Layout.Section>
          )}
          
          {actionData && "error" in actionData && (
            <Layout.Section>
              <Banner
                status="critical"
                onDismiss={() => {}}
              >
                {actionData.error}
              </Banner>
            </Layout.Section>
          )}
          
          <Layout.Section variant="twoThirds">
            <BundleForm
              bundle={bundle}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={isSubmitting}
              onFormStateChange={setFormState}
            />
          </Layout.Section>
          
          <Layout.Section variant="oneThird">
            <BundleSummary
              title={formState.title}
              status={formState.status}
              layoutType={formState.layoutType}
              discountType={formState.discountType}
              discountValue={formState.discountValue}
              steps={formState.steps}
              isValid={formState.isValid}
              isEdit={true}
              isSubmitting={isSubmitting}
              onSubmit={() => {
                // Find and click the actual form submit button
                const form = document.querySelector('form');
                if (form) {
                  const submitButton = form.querySelector('button[type="submit"]');
                  if (submitButton) {
                    (submitButton as HTMLButtonElement).click();
                  }
                }
              }}
            />
          </Layout.Section>
        </Layout>
      </Page>
      
      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete bundle?"
        primaryAction={{
          content: "Delete bundle",
          destructive: true,
          onAction: confirmDelete,
          loading: isDeleting,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setDeleteModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <p>Are you sure you want to delete "{bundle.title}"? This action cannot be undone.</p>
        </Modal.Section>
      </Modal>
      
      {/* Duplicate Modal */}
      <Modal
        open={duplicateModalOpen}
        onClose={() => setDuplicateModalOpen(false)}
        title="Duplicate Bundle"
        primaryAction={{
          content: "Duplicate",
          onAction: confirmDuplicate,
          loading: isDuplicating,
          disabled: !duplicateTitle.trim(),
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setDuplicateModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="Bundle title"
              value={duplicateTitle}
              onChange={setDuplicateTitle}
              autoComplete="off"
              error={!duplicateTitle.trim() ? "Title is required" : undefined}
              helpText="Enter a unique title for the duplicated bundle"
              requiredIndicator
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
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>The bundle you're looking for doesn't exist or has been removed.</p>
            </EmptyState>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
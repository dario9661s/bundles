import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useNavigate, useSubmit, useNavigation, Link, useActionData } from "@remix-run/react";
import { Page, Layout, Button, BlockStack, TextField, Card, Filters, ChoiceList, InlineStack, Spinner, Text, Banner, Frame, Toast, Pagination } from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { BundleList } from "~/components/BundleList";
import { listBundles, deleteBundle, updateBundle } from "~/services/bundle-metaobject.server";
import type { Bundle, ListBundlesResponse, ErrorResponse } from "~/types/bundle";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useFetcher } from "@remix-run/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const status = url.searchParams.get("status") || "all";
  const search = url.searchParams.get("search") || "";

  try {
    const result = await listBundles(admin, page, limit, status === "all" ? undefined : status as any);
    
    // Apply search filter on the server side if needed
    let filteredBundles = result.bundles;
    if (search.trim()) {
      const searchLower = search.toLowerCase().trim();
      filteredBundles = result.bundles.filter(bundle => 
        bundle.title.toLowerCase().includes(searchLower) ||
        bundle.status.toLowerCase().includes(searchLower)
      );
    }
    
    const response: ListBundlesResponse = {
      bundles: filteredBundles,
      pagination: result.pagination,
    };

    return json(response);
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
  const { admin } = await authenticate.admin(request);
  
  const formData = await request.formData();
  const action = formData.get("action");
  const bundleId = formData.get("bundleId") as string;

  try {
    if (action === "delete") {
      const result = await deleteBundle(admin, bundleId);
      
      if (!result.success) {
        return json({ 
          success: false,
          error: result.errors.join(", ") || "Failed to delete bundle",
          action: "delete"
        }, { status: 400 });
      }
      
      return json({ 
        success: true, 
        message: "Bundle deleted successfully",
        action: "delete",
        bundleId 
      });
    }

    if (action === "toggleStatus") {
      const newStatus = formData.get("status") as Bundle['status'];
      const result = await updateBundle(admin, bundleId, { status: newStatus });
      
      if (!result.bundle) {
        return json({ 
          success: false,
          error: result.errors.join(", ") || "Failed to update bundle status",
          action: "toggleStatus"
        }, { status: 400 });
      }
      
      return json({ 
        success: true, 
        message: `Bundle status changed to ${newStatus}`,
        action: "toggleStatus",
        bundle: result.bundle
      });
    }

    return json({ 
      success: false,
      error: "Invalid action",
      action
    }, { status: 400 });
  } catch (error) {
    console.error("Action failed:", error);
    return json({ 
      success: false,
      error: error instanceof Error ? error.message : "Operation failed. Please try again.",
      action
    }, { status: 500 });
  }
};

export default function BundlesPage() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  const submit = useSubmit();
  const navigation = useNavigation();
  const fetcher = useFetcher<typeof loader>();
  
  const [error, setError] = useState<string | undefined>(undefined);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [isClientSide, setIsClientSide] = useState(false);
  const [lastSearchParams, setLastSearchParams] = useState("");
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastError, setToastError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [actionBundleIds, setActionBundleIds] = useState<Set<string>>(new Set());
  
  const isLoading = navigation.state !== "idle";
  const isSearching = fetcher.state !== "idle";

  // Use fetcher data if available, otherwise fallback to loader data
  const currentData = fetcher.data || data;

  // Set client side flag after hydration
  useEffect(() => {
    setIsClientSide(true);
  }, []);

  useEffect(() => {
    if ("error" in currentData && currentData.error) {
      setError(currentData.error);
    }
  }, [currentData]);

  // Handle action responses for toast notifications
  useEffect(() => {
    if (actionData) {
      if (actionData.success) {
        setToastMessage(actionData.message || "Action completed successfully");
        setToastError(false);
        setToastActive(true);
      } else {
        setToastMessage(actionData.error || "An error occurred");
        setToastError(true);
        setToastActive(true);
      }
      
      // Clear action bundle ID from loading state
      if (actionData.bundleId) {
        setActionBundleIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(actionData.bundleId);
          return newSet;
        });
      }
    }
  }, [actionData]);

  // Modern search with proper debouncing
  useEffect(() => {
    if (!isClientSide) return; // Don't run on server side
    
    // Only search if we have at least 2 characters or a status filter
    const shouldSearch = searchValue.length >= 2 || searchValue === "";
    if (!shouldSearch && statusFilter.length === 0) return;
    
    const timeoutId = setTimeout(() => {
      const searchParams = new URLSearchParams();
      
      // Only add search param if it's 2+ characters
      if (searchValue.length >= 2) {
        searchParams.set("search", searchValue.trim());
      }
      
      if (statusFilter.length > 0 && !statusFilter.includes("all")) {
        searchParams.set("status", statusFilter[0]);
      }
      
      const newSearchParams = searchParams.toString();
      
      // Only fetch if params actually changed
      if (newSearchParams !== lastSearchParams) {
        setLastSearchParams(newSearchParams);
        fetcher.load(`/app/bundles?${newSearchParams}`);
      }
    }, 500); // 500ms debounce for better UX

    return () => clearTimeout(timeoutId);
  }, [searchValue, statusFilter, isClientSide, lastSearchParams, fetcher]);

  const handleEdit = useCallback((bundleId: string) => {
    // Encode the GID to handle forward slashes
    const encodedId = encodeURIComponent(bundleId);
    navigate(`/app/bundles/${encodedId}/edit`);
  }, [navigate]);

  const handleDelete = useCallback(async (bundleId: string) => {
    // Prevent double-clicks
    if (actionBundleIds.has(bundleId)) return;
    
    setActionBundleIds(prev => new Set(prev).add(bundleId));
    const formData = new FormData();
    formData.append("action", "delete");
    formData.append("bundleId", bundleId);
    submit(formData, { method: "post" });
  }, [submit, actionBundleIds]);

  const handleStatusToggle = useCallback(async (bundleId: string, status: Bundle['status']) => {
    // Prevent double-clicks
    if (actionBundleIds.has(bundleId)) return;
    
    setActionBundleIds(prev => new Set(prev).add(bundleId));
    const formData = new FormData();
    formData.append("action", "toggleStatus");
    formData.append("bundleId", bundleId);
    formData.append("status", status);
    submit(formData, { method: "post" });
  }, [submit, actionBundleIds]);

  const handleDuplicate = useCallback(async (bundleId: string, title: string, status?: "active" | "draft") => {
    try {
      const result = await fetch(`/api/bundles/${bundleId}/duplicate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          status: status || "draft",
        }),
      });
      
      const data = await result.json();
      console.log("Duplicate API response:", data);
      
      if (result.ok && data.bundle) {
        // Show success toast
        setToastMessage(`Bundle duplicated successfully as "${data.bundle.title}"`);
        setToastError(false);
        setToastActive(true);
        
        // Reload the current page to show the new bundle
        fetcher.load(`/app/bundles?page=${currentPage}`);
        
        // Navigate to the new bundle after a short delay
        setTimeout(() => {
          const encodedId = encodeURIComponent(data.bundle.id);
          navigate(`/app/bundles/${encodedId}`);
        }, 1500);
      } else {
        throw new Error(data.message || "Failed to duplicate bundle");
      }
    } catch (error) {
      // Show error toast
      setToastMessage(error instanceof Error ? error.message : "Failed to duplicate bundle");
      setToastError(true);
      setToastActive(true);
      throw error;
    }
  }, [navigate, fetcher, currentPage]);

  // Clear filters handler
  const handleClearFilters = useCallback(() => {
    setSearchValue("");
    setStatusFilter([]);
  }, []);

  // Filters configuration
  const filters = [
    {
      key: "status",
      label: "Status",
      filter: (
        <ChoiceList
          title="Status"
          titleHidden
          choices={[
            { label: "All", value: "all" },
            { label: "Active", value: "active" },
            { label: "Draft", value: "draft" },
            { label: "Inactive", value: "inactive" },
          ]}
          selected={statusFilter.length > 0 ? statusFilter : ["all"]}
          onChange={(value) => setStatusFilter(value)}
          allowMultiple={false}
        />
      ),
      shortcut: true,
    },
  ];

  const appliedFilters = [];
  if (searchValue) {
    appliedFilters.push({
      key: "search",
      label: `Search: ${searchValue}`,
      onRemove: () => setSearchValue(""),
    });
  }
  if (statusFilter.length > 0 && !statusFilter.includes("all")) {
    appliedFilters.push({
      key: "status",
      label: `Status: ${statusFilter[0]}`,
      onRemove: () => setStatusFilter([]),
    });
  }

  return (
    <Page
      title="Product Bundles"
      primaryAction={{
        content: "Create bundle",
        url: "/app/bundles/create",
      }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {/* Search and Filters - only show after hydration */}
            {isClientSide && (
              <Card>
                <BlockStack gap="400">
                  <TextField
                    label="Search bundles"
                    labelHidden
                    value={searchValue}
                    onChange={setSearchValue}
                    placeholder="Search bundles (min. 2 characters)..."
                    clearButton
                    onClearButtonClick={() => setSearchValue("")}
                    autoComplete="off"
                    helpText={searchValue.length === 1 ? "Type at least 2 characters to search" : ""}
                    suffix={isSearching ? <Spinner size="small" /> : undefined}
                  />
                  
                  <Filters
                    queryValue={searchValue}
                    queryPlaceholder="Search bundles..."
                    onQueryChange={setSearchValue}
                    onQueryClear={() => setSearchValue("")}
                    filters={filters}
                    appliedFilters={appliedFilters}
                    onClearAll={handleClearFilters}
                    hideQueryField // We have our own search field above
                  />
                </BlockStack>
              </Card>
            )}

            {"bundles" in currentData && (
              <>
                <BundleList
                  bundles={currentData.bundles}
                  pagination={currentData.pagination}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                  onStatusToggle={handleStatusToggle}
                  loading={isLoading || isSearching}
                  error={error}
                  actionLoadingIds={actionBundleIds}
                />
                
                {/* Pagination */}
                {currentData.pagination && (currentData.pagination.hasNext || currentData.pagination.page > 1) && (
                  <Box paddingBlockStart="400" paddingBlockEnd="400">
                    <InlineStack align="center">
                      <Pagination
                        hasPrevious={currentData.pagination.page > 1}
                        onPrevious={() => {
                          const prevPage = Math.max(1, currentData.pagination.page - 1);
                          fetcher.load(`/app/bundles?page=${prevPage}`);
                        }}
                        hasNext={currentData.pagination.hasNext}
                        onNext={() => {
                          const nextPage = currentData.pagination.page + 1;
                          fetcher.load(`/app/bundles?page=${nextPage}`);
                        }}
                      />
                    </InlineStack>
                  </Box>
                )}
              </>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>
      
      {toastActive && (
        <Toast
          content={toastMessage}
          error={toastError}
          onDismiss={() => setToastActive(false)}
          duration={4500}
        />
      )}
    </Page>
  );
}
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useNavigate, useSubmit, useNavigation, Link, useActionData, useLocation } from "@remix-run/react";
import { Page, Layout, Button, BlockStack, TextField, Card, Filters, ChoiceList, InlineStack, Spinner, Text, Banner, Frame, Toast, Pagination, Box, ButtonGroup } from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { BundleList } from "~/components/BundleList";
import { listBundles, deleteBundle, updateBundle } from "~/services/bundle-metaobject.server";
import type { Bundle, ListBundlesResponse, ErrorResponse, BulkDeleteBundlesResponse, BulkStatusUpdateResponse } from "~/types/bundle";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useFetcher } from "@remix-run/react";


export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "7");
  const status = url.searchParams.get("status") || "all";
  const search = url.searchParams.get("search") || "";

  try {
    const result = await listBundles(
      admin, 
      page, 
      limit, 
      status === "all" ? undefined : status as any
    );
    
    // Apply search filter on the frontend since backend doesn't support search yet
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
      pagination: { page: 1, limit: 7, total: 0, hasNext: false },
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
  const location = useLocation();
  
  // Get URL params for initial state - safe for SSR
  const searchParams = new URLSearchParams(location.search);
  const urlStatus = searchParams.get("status") || "";
  const urlSearch = searchParams.get("search") || "";
  
  const [error, setError] = useState<string | undefined>(undefined);
  const [searchValue, setSearchValue] = useState(urlSearch);
  const [statusFilter, setStatusFilter] = useState<string[]>(urlStatus && urlStatus !== "all" ? [urlStatus] : []);
  const [isClientSide, setIsClientSide] = useState(false);
  // Initialize lastSearchParams with current URL params to prevent initial fetch
  const initialSearchParams = new URLSearchParams();
  if (urlSearch) initialSearchParams.set("search", urlSearch);
  if (urlStatus && urlStatus !== "all") initialSearchParams.set("status", urlStatus);
  initialSearchParams.set("page", "1");
  const [lastSearchParams, setLastSearchParams] = useState(initialSearchParams.toString());
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastError, setToastError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [actionBundleIds, setActionBundleIds] = useState<Set<string>>(new Set());
  
  // Bulk operations state
  const [selectedBundleIds, setSelectedBundleIds] = useState<string[]>([]);
  const [bulkOperationInProgress, setBulkOperationInProgress] = useState(false);
  const [individualActionInProgress, setIndividualActionInProgress] = useState(false);
  
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
      
      // Clear individual action loading state
      setIndividualActionInProgress(false);
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
      
      // Always reset to page 1 when filters change
      searchParams.set("page", "1");
      searchParams.set("limit", "7");
      
      const newSearchParams = searchParams.toString();
      
      // Only update if params actually changed
      if (newSearchParams !== lastSearchParams) {
        setLastSearchParams(newSearchParams);
        setCurrentPage(1); // Reset page state
        
        // Update URL without navigation using History API
        window.history.replaceState({}, '', `/app/bundles?${newSearchParams}`);
        
        // Fetch data with the new params
        fetcher.load(`/app/bundles?${newSearchParams}`);
      }
    }, 500); // 500ms debounce for better UX

    return () => clearTimeout(timeoutId);
  }, [searchValue, statusFilter, isClientSide, lastSearchParams, navigate]);

  const handleEdit = useCallback((bundleId: string) => {
    // Encode the GID to handle forward slashes
    const encodedId = encodeURIComponent(bundleId);
    navigate(`/app/bundles/${encodedId}/edit`);
  }, [navigate]);

  const handleDelete = useCallback(async (bundleId: string) => {
    // Prevent double-clicks
    if (individualActionInProgress) return;
    
    setIndividualActionInProgress(true);
    const formData = new FormData();
    formData.append("action", "delete");
    formData.append("bundleId", bundleId);
    submit(formData, { method: "post" });
  }, [submit, individualActionInProgress]);

  const handleStatusToggle = useCallback(async (bundleId: string, status: Bundle['status']) => {
    // Prevent double-clicks
    if (individualActionInProgress) return;
    
    setIndividualActionInProgress(true);
    const formData = new FormData();
    formData.append("action", "toggleStatus");
    formData.append("bundleId", bundleId);
    formData.append("status", status);
    submit(formData, { method: "post" });
  }, [submit, individualActionInProgress]);

  const handleDuplicate = useCallback(async (bundleId: string, title: string, status?: "active" | "draft") => {
    try {
      const encodedBundleId = encodeURIComponent(bundleId);
      const result = await fetch(`/api/bundles/${encodedBundleId}/duplicate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          status: status || "draft",
        }),
      });
      
      if (!result.ok) {
        // Handle non-200 responses
        const errorText = await result.text();
        console.error("Duplicate API error:", result.status, errorText);
        throw new Error(`API error: ${result.status} - ${errorText.includes('<!DOCTYPE') ? 'Server error' : errorText}`);
      }

      const data = await result.json();
      console.log("Duplicate API response:", data);
      
      if (data.bundle) {
        // Show success toast
        setToastMessage(`Bundle duplicated successfully as "${data.bundle.title}"`);
        setToastError(false);
        setToastActive(true);
        
        // Reload the current page to show the new bundle
        const params = new URLSearchParams();
        params.set('page', currentPage.toString());
        params.set('limit', '7');
        if (statusFilter.length > 0 && !statusFilter.includes("all")) {
          params.set("status", statusFilter[0]);
        }
        if (searchValue.length >= 2) {
          params.set("search", searchValue.trim());
        }
        fetcher.load(`/app/bundles?${params.toString()}`);
        
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

  // Bulk operation handlers
  const handleBulkDelete = useCallback(async (bundleIds: string[]): Promise<BulkDeleteBundlesResponse> => {
    setBulkOperationInProgress(true);
    
    try {
      const response = await fetch('/api/bundles/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bundleIds }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete bundles');
      }
      
      // Show success/failure toast
      if (result.success) {
        setToastMessage(`${result.summary.deleted} bundle${result.summary.deleted === 1 ? '' : 's'} deleted successfully`);
        setToastError(false);
      } else {
        setToastMessage(`${result.summary.failed} bundle${result.summary.failed === 1 ? '' : 's'} failed to delete`);
        setToastError(true);
      }
      setToastActive(true);
      
      // Reload the bundle list with current params
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', '10');
      if (statusFilter.length > 0 && !statusFilter.includes("all")) {
        params.set("status", statusFilter[0]);
      }
      if (searchValue.length >= 2) {
        params.set("search", searchValue.trim());
      }
      fetcher.load(`/app/bundles?${params.toString()}`);
      
      return result;
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : "Failed to delete bundles");
      setToastError(true);
      setToastActive(true);
      throw error;
    } finally {
      setBulkOperationInProgress(false);
    }
  }, [fetcher, currentPage, statusFilter, searchValue]);

  const handleBulkStatusUpdate = useCallback(async (bundleIds: string[], status: Bundle['status']): Promise<BulkStatusUpdateResponse> => {
    setBulkOperationInProgress(true);
    
    try {
      const response = await fetch('/api/bundles/bulk-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bundleIds, status }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to update bundle statuses');
      }
      
      // Show success/failure toast
      if (result.success) {
        setToastMessage(`${result.summary.updated} bundle${result.summary.updated === 1 ? '' : 's'} updated successfully`);
        setToastError(false);
      } else {
        setToastMessage(`${result.summary.failed} bundle${result.summary.failed === 1 ? '' : 's'} failed to update`);
        setToastError(true);
      }
      setToastActive(true);
      
      // Reload the bundle list with current params
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', '10');
      if (statusFilter.length > 0 && !statusFilter.includes("all")) {
        params.set("status", statusFilter[0]);
      }
      if (searchValue.length >= 2) {
        params.set("search", searchValue.trim());
      }
      fetcher.load(`/app/bundles?${params.toString()}`);
      
      return result;
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : "Failed to update bundle statuses");
      setToastError(true);
      setToastActive(true);
      throw error;
    } finally {
      setBulkOperationInProgress(false);
    }
  }, [fetcher, currentPage, statusFilter, searchValue]);

  // Clear filters handler
  const handleClearFilters = useCallback(() => {
    setSearchValue("");
    setStatusFilter([]);
  }, []);

  // Get current status filter for button states
  const currentStatusFilter = statusFilter.length > 0 && !statusFilter.includes("all") ? statusFilter[0] : "all";


  return (
    <Frame>
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
            {/* Search and Controls - only show after hydration */}
            {isClientSide && (
              <Card>
                <BlockStack gap="400">
                  {/* Search Field - Full Width */}
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
                  
                  {/* Filter Buttons and Sort Row */}
                  <InlineStack gap="400" align="space-between" blockAlign="end">
                    <Box>
                      <BlockStack gap="200">
                        <Text variant="bodySm" tone="subdued">Filter by status</Text>
                        <ButtonGroup segmented>
                          <Button 
                            pressed={currentStatusFilter === "all"}
                            onClick={() => setStatusFilter([])}
                          >
                            All
                          </Button>
                          <Button 
                            pressed={currentStatusFilter === "active"}
                            onClick={() => setStatusFilter(["active"])}
                          >
                            Active
                          </Button>
                          <Button 
                            pressed={currentStatusFilter === "draft"}
                            onClick={() => setStatusFilter(["draft"])}
                          >
                            Draft
                          </Button>
                          <Button 
                            pressed={currentStatusFilter === "inactive"}
                            onClick={() => setStatusFilter(["inactive"])}
                          >
                            Inactive
                          </Button>
                        </ButtonGroup>
                      </BlockStack>
                    </Box>
                  </InlineStack>
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
                  
                  // Bulk operations
                  bulkOperationsEnabled={true}
                  selectedBundleIds={selectedBundleIds}
                  onSelectionChange={setSelectedBundleIds}
                  onBulkDelete={handleBulkDelete}
                  onBulkStatusUpdate={handleBulkStatusUpdate}
                  bulkOperationInProgress={bulkOperationInProgress}
                  individualActionInProgress={individualActionInProgress}
                  
                  loading={isLoading || isSearching}
                  error={error}
                />
                
                {/* Pagination */}
                {currentData.pagination && (currentData.pagination.hasNext || currentData.pagination.page > 1) && (
                  <Box paddingBlockStart="400" paddingBlockEnd="400">
                    <InlineStack align="center">
                      <Pagination
                        hasPrevious={currentData.pagination.page > 1}
                        onPrevious={() => {
                          const prevPage = Math.max(1, currentData.pagination.page - 1);
                          const params = new URLSearchParams();
                          params.set('page', prevPage.toString());
                          params.set('limit', '7');
                          if (statusFilter.length > 0 && !statusFilter.includes("all")) {
                            params.set("status", statusFilter[0]);
                          }
                          if (searchValue.length >= 2) {
                            params.set("search", searchValue.trim());
                          }
                          fetcher.load(`/app/bundles?${params.toString()}`);
                          setCurrentPage(prevPage);
                        }}
                        hasNext={currentData.pagination.hasNext}
                        onNext={() => {
                          const nextPage = currentData.pagination.page + 1;
                          const params = new URLSearchParams();
                          params.set('page', nextPage.toString());
                          params.set('limit', '7');
                          if (statusFilter.length > 0 && !statusFilter.includes("all")) {
                            params.set("status", statusFilter[0]);
                          }
                          if (searchValue.length >= 2) {
                            params.set("search", searchValue.trim());
                          }
                          fetcher.load(`/app/bundles?${params.toString()}`);
                          setCurrentPage(nextPage);
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
    </Frame>
  );
}
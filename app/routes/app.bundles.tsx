import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useNavigate, useSubmit, useNavigation, Link } from "@remix-run/react";
import { Page, Layout, Button, BlockStack, TextField, Card, Filters, ChoiceList, InlineStack, Spinner, Text } from "@shopify/polaris";
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
  const limit = parseInt(url.searchParams.get("limit") || "50"); // Increased for client-side filtering
  const status = url.searchParams.get("status") || "all";
  const search = url.searchParams.get("search") || "";

  try {
    const result = await listBundles(admin, page, limit, status === "all" ? undefined : status as any);
    
    // Apply search filter on the server side
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
      pagination: {
        page,
        limit,
        total: filteredBundles.length,
        hasNext: false, // Disable pagination when searching
      },
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
        return json({ error: result.errors.join(", ") }, { status: 400 });
      }
      
      return json({ success: true });
    }

    if (action === "toggleStatus") {
      const newStatus = formData.get("status") as Bundle['status'];
      const result = await updateBundle(admin, bundleId, { status: newStatus });
      
      if (!result.bundle) {
        return json({ error: result.errors.join(", ") }, { status: 400 });
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
  const fetcher = useFetcher<typeof loader>();
  
  const [error, setError] = useState<string | undefined>(undefined);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [isClientSide, setIsClientSide] = useState(false);
  const [lastSearchParams, setLastSearchParams] = useState("");
  
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
    navigate(`/app/bundles/${bundleId}/edit`);
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
              <BundleList
                bundles={currentData.bundles}
                pagination={currentData.pagination}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStatusToggle={handleStatusToggle}
                loading={isLoading || isSearching}
                error={error}
              />
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
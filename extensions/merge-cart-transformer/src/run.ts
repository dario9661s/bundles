import type {
  RunInput,
  FunctionRunResult,
  CartOperation,
} from "../generated/api";

const NO_CHANGES: FunctionRunResult = {
  operations: [],
};

interface BundleConfiguration {
  id: string;
  title: string;
  discountType: "percentage" | "fixed" | "total";
  discountValue: number;
  steps: Array<{
    id: string;
    products: Array<{
      id: string;
    }>;
  }>;
}

export function run(input: RunInput): FunctionRunResult {
  // Check for bundle configurations in metafield
  if (!input.cartTransform.mergeConfigurations) {
    console.error("No merge configurations found.");
    return NO_CHANGES;
  }

  let bundles: BundleConfiguration[];
  try {
    const bundleConfig = JSON.parse(input.cartTransform.mergeConfigurations.value);
    bundles = bundleConfig.bundles || [];
  } catch (error) {
    console.error("Failed to parse bundle configurations:", error);
    return NO_CHANGES;
  }

  if (!bundles || bundles.length === 0) {
    return NO_CHANGES;
  }

  const operations: CartOperation[] = [];
  const cartProductIds = new Set<string>();
  const cartLinesByProductId = new Map<string, typeof input.cart.lines[0][]>();

  // Build a map of product IDs to cart lines
  input.cart.lines.forEach((line) => {
    if ("product" in line.merchandise) {
      const productId = line.merchandise.id;
      cartProductIds.add(productId);
      
      if (!cartLinesByProductId.has(productId)) {
        cartLinesByProductId.set(productId, []);
      }
      cartLinesByProductId.get(productId)!.push(line);
    }
  });

  // Check each bundle to see if all products are in the cart
  bundles.forEach((bundle) => {
    const bundleProductIds = new Set<string>();
    
    // Collect all product IDs from the bundle
    bundle.steps.forEach((step) => {
      step.products.forEach((product) => {
        bundleProductIds.add(product.id);
      });
    });

    // Check if all bundle products are in the cart
    const allProductsInCart = Array.from(bundleProductIds).every(
      (productId) => cartProductIds.has(productId)
    );

    if (allProductsInCart) {
      // All products from this bundle are in the cart, create merge operation
      const cartLinesToMerge: Array<{ cartLineId: string; quantity: number }> = [];
      const productTitles: string[] = [];
      let parentProductId: string | null = null;
      
      // Collect all cart lines for this bundle
      bundleProductIds.forEach((productId) => {
        const lines = cartLinesByProductId.get(productId) || [];
        lines.forEach((line) => {
          cartLinesToMerge.push({
            cartLineId: line.id,
            quantity: line.quantity,
          });
          
          if ("product" in line.merchandise) {
            productTitles.push(line.merchandise.product.title);
            // Use the first product as the parent
            if (!parentProductId) {
              parentProductId = line.merchandise.id;
            }
          }
        });
      });

      if (parentProductId && cartLinesToMerge.length > 1) {
        // Create the merge operation
        const mergeOperation: CartOperation = {
          merge: {
            cartLines: cartLinesToMerge,
            title: bundle.title || productTitles.join(" + "),
            parentVariantId: parentProductId,
            // Apply discount based on bundle configuration
            price: calculateBundlePrice(bundle, cartLinesToMerge, input),
          },
        };
        
        operations.push(mergeOperation);
      }
    }
  });

  return {
    operations,
  };
}

function calculateBundlePrice(
  bundle: BundleConfiguration,
  cartLines: Array<{ cartLineId: string; quantity: number }>,
  input: RunInput
): { percentageDecrease?: { value: string } } | undefined {
  // Calculate discount based on bundle configuration
  switch (bundle.discountType) {
    case "percentage":
      return {
        percentageDecrease: {
          value: bundle.discountValue.toString(),
        },
      };
    
    case "fixed":
      // For fixed discount, we need to calculate the percentage
      // This is a simplified version - in production you'd need to calculate
      // the total price of items and convert fixed discount to percentage
      const totalPrice = calculateTotalPrice(cartLines, input);
      if (totalPrice > 0) {
        const percentageDiscount = (bundle.discountValue / totalPrice) * 100;
        return {
          percentageDecrease: {
            value: Math.min(percentageDiscount, 100).toString(), // Cap at 100%
          },
        };
      }
      break;
    
    case "total":
      // For total price, calculate the discount needed
      const currentTotal = calculateTotalPrice(cartLines, input);
      if (currentTotal > bundle.discountValue) {
        const discountAmount = currentTotal - bundle.discountValue;
        const percentageDiscount = (discountAmount / currentTotal) * 100;
        return {
          percentageDecrease: {
            value: percentageDiscount.toString(),
          },
        };
      }
      break;
  }
  
  return undefined;
}

function calculateTotalPrice(
  cartLines: Array<{ cartLineId: string; quantity: number }>,
  input: RunInput
): number {
  let total = 0;
  
  cartLines.forEach(({ cartLineId }) => {
    const line = input.cart.lines.find((l) => l.id === cartLineId);
    if (line && line.cost) {
      // Use the total amount from the line cost
      const amount = parseFloat(line.cost.totalAmount.amount);
      total += amount;
    }
  });
  
  return total;
}
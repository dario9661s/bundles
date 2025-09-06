import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-07";
import prisma from "./db.server";
import { createCartTransform } from "~/.server/services/shopify/cart-transform-service";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.July24,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  restResources,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
  hooks: {
    afterAuth: async ({ session, admin }) => {
      const { shop } = session;

      const functionId = process.env.CART_TRANSFORM_FUNCTION_ID;
      if (!functionId) {
        console.error("Function ID not set in env.");

        return;
      }

      const cartTransformAlreadyInstalled =
        (await prisma.cartTransform.count({
          where: { shop },
        })) > 0;

      if (cartTransformAlreadyInstalled) {
        console.error("Cart transform already installed.");

        return;
      }

      const createCartTransformResponse = await createCartTransform(
        functionId,
        admin,
      );
      const cartTransform =
        createCartTransformResponse.data?.cartTransformCreate?.cartTransform;
      if (!cartTransform) {
        console.log(
          "Could not install cart transform.",
          createCartTransformResponse,
        );
        return;
      }

      await prisma.cartTransform.create({
        data: {
          shop,
          functionId,
          cartTransformId: cartTransform.id,
        },
      });
    },
  },
});

export default shopify;
export const apiVersion = ApiVersion.July24;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;

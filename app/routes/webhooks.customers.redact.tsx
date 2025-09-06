import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  // Implement handling of mandatory compliance topics
  // See: https://shopify.dev/docs/apps/build/privacy-law-compliance
  console.log(`Received ${topic} webhook for ${shop}`);
  prisma.mergeConfiguration.deleteMany({ where: { shop } });
  console.log(JSON.stringify(payload, null, 2));

  return new Response();
};

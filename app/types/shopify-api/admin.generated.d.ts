/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as AdminTypes from './admin.types';

export type CartTransformCreateMutationVariables = AdminTypes.Exact<{
  functionId: AdminTypes.Scalars['String']['input'];
}>;


export type CartTransformCreateMutation = { cartTransformCreate?: AdminTypes.Maybe<{ cartTransform?: AdminTypes.Maybe<Pick<AdminTypes.CartTransform, 'id'>>, userErrors: Array<Pick<AdminTypes.CartTransformCreateUserError, 'field' | 'message'>> }> };

export type MetafieldsSetMutationVariables = AdminTypes.Exact<{
  metafields: Array<AdminTypes.MetafieldsSetInput> | AdminTypes.MetafieldsSetInput;
}>;


export type MetafieldsSetMutation = { metafieldsSet?: AdminTypes.Maybe<{ metafields?: AdminTypes.Maybe<Array<Pick<AdminTypes.Metafield, 'id' | 'key' | 'namespace' | 'ownerType' | 'value'>>>, userErrors: Array<Pick<AdminTypes.MetafieldsSetUserError, 'field' | 'message'>> }> };

export type ProductVariantQueryVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
}>;


export type ProductVariantQuery = { productVariant?: AdminTypes.Maybe<(
    Pick<AdminTypes.ProductVariant, 'title'>
    & { image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>>, product: (
      Pick<AdminTypes.Product, 'title'>
      & { media: { nodes: Array<{ image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>> }> } }
    ) }
  )> };

interface GeneratedQueryTypes {
  "#graphql\n  query ProductVariant ($id: ID!) {\n    productVariant(id: $id) {\n      title\n      image {\n        url\n      }\n      product {\n        title\n        media(first: 1, query: \"media_type=IMAGE\") {\n          nodes {\n            ... on MediaImage {\n              image {\n                url\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n": {return: ProductVariantQuery, variables: ProductVariantQueryVariables},
}

interface GeneratedMutationTypes {
  "#graphql\nmutation cartTransformCreate($functionId: String!) {\n  cartTransformCreate(functionId: $functionId) {\n    cartTransform {\n      id\n    }\n    userErrors {\n      field\n      message\n    }\n  }\n}\n": {return: CartTransformCreateMutation, variables: CartTransformCreateMutationVariables},
  "#graphql\nmutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {\n  metafieldsSet(metafields: $metafields) {\n    metafields {\n      id\n      key\n      namespace\n      ownerType\n      value\n    }\n    userErrors {\n      field\n      message\n    }\n  }\n}\n": {return: MetafieldsSetMutation, variables: MetafieldsSetMutationVariables},
}
declare module '@shopify/admin-api-client' {
  type InputMaybe<T> = AdminTypes.InputMaybe<T>;
  interface AdminQueries extends GeneratedQueryTypes {}
  interface AdminMutations extends GeneratedMutationTypes {}
}

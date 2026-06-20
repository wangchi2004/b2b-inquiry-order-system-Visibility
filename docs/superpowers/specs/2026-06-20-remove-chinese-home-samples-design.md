# Remove Chinese Home and Sample Pages

## Goal

Remove the standalone Chinese home page and Chinese sample catalog while keeping the Chinese inquiry-order workflow available.

## Route Behavior

- `/zh` returns the application's 404 response.
- `/zh/samples` returns the application's 404 response.
- `/zh/order/[token]` remains available, including `/zh/order/general`.
- `/zh/cart` remains available so Chinese customers can complete an inquiry.
- English, Korean, and Japanese home, sample, order, and cart routes are unchanged.

## Navigation

- No visible link may point to `/zh` or `/zh/samples`.
- Chinese remains in the main login language selector because it links directly to `/zh/order/general`.
- Links inside English, Korean, and Japanese sample pages continue to return to their matching localized home pages.

## Implementation

Keep `zh` in the global `next-intl` locale list. Add a small locale-policy helper that defines which locales have public home and sample pages, and use it in the shared localized page routes to return `notFound()` for Chinese.

## Verification

- Policy tests prove that `en`, `ko`, and `ja` allow public home/sample pages while `zh` does not.
- `npm run build` succeeds.
- `/zh` and `/zh/samples` return 404.
- `/zh/order/general` and `/zh/cart` continue to render.

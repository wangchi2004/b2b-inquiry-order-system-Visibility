# Website language

The header language selector navigates between /en, /zh, /ja and /ko while
preserving supported page paths, filters and account login. Shared storefront
interface strings live in `src/i18n/shopText.ts`; legacy page/card copy continues
to use the existing message catalogs. Header, hero, navigation, catalog/search,
product detail, account, registration, recovery and favorites use the route locale.
The selector also updates the document language after navigation.

Product names and descriptions use catalog translations already stored in the
database, falling back to the original record when a translation is absent.
No product descriptions are automatically rewritten by changing the language.

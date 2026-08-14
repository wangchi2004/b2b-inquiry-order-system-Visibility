import { CatalogCenter } from "@/components/CatalogCenter";

export const dynamic = "force-dynamic";

type LocalizedCatalogPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function LocalizedCatalogPage({
  params
}: LocalizedCatalogPageProps) {
  const { locale } = await params;

  return <CatalogCenter locale={locale} />;
}

import { CatalogCenter } from "@/components/CatalogCenter";

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

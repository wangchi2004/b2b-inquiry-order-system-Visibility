import { getTranslations } from "next-intl/server";
import { CartPageContent } from "@/app/cart/page";

type LocalizedCartPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function LocalizedCartPage({
  params
}: LocalizedCartPageProps) {
  const { locale } = await params;
  const common = await getTranslations("Common");
  const catalog = await getTranslations("Catalog");
  const cart = await getTranslations("Cart");

  return (
    <CartPageContent
      locale={locale}
      labels={{
        siteName: common("siteName"),
        home: common("home"),
        cart: common("cart"),
        title: cart("title"),
        continueShopping: common("continueShopping"),
        notice: cart("notice"),
        emptyTitle: cart("emptyTitle"),
        emptyDescription: cart("emptyDescription"),
        productImage: cart("productImage"),
        productInformation: cart("productInformation"),
        quantityTotal: cart("quantityTotal"),
        noImage: cart("noImage"),
        color: catalog("color"),
        custom: cart("custom"),
        size: common("size"),
        sizeRange: catalog("sizeRange"),
        moq: catalog("moq"),
        totalQuantity: cart("totalQuantity"),
        unitPrice: cart("unitPrice"),
        total: cart("total"),
        totalItems: cart("totalItems"),
        estimatedTotal: cart("estimatedTotal"),
        waitingPrice: cart("waitingPrice"),
        availability: cart("availability"),
        yourInformation: cart("yourInformation"),
        name: cart("name"),
        namePlaceholder: cart("namePlaceholder"),
        email: common("email"),
        emailPlaceholder: cart("emailPlaceholder"),
        country: common("country"),
        countryPlaceholder: cart("countryPlaceholder"),
        company: cart("company"),
        companyPlaceholder: cart("companyPlaceholder"),
        note: cart("note"),
        notePlaceholder: cart("notePlaceholder"),
        inquiryImages: cart("inquiryImages"),
        inquiryImagesHelp: cart("inquiryImagesHelp"),
        whatsapp: common("whatsapp"),
        whatsappPlaceholder: cart("whatsappPlaceholder"),
        submitInquiry: common("submitInquiry"),
        submitLoading: cart("submitLoading"),
        remove: cart("remove")
      }}
    />
  );
}

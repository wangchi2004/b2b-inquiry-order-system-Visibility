import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Header } from "@/components/Header";
import { GeneralOrderEntryForm } from "@/components/GeneralOrderEntryForm";
import { HomePhotoWall } from "@/components/HomePhotoWall";
import { getHomeGalleryImages } from "@/lib/products";

type LocalizedHomePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function LocalizedHomePage({
  params
}: LocalizedHomePageProps) {
  const { locale } = await params;
  const common = await getTranslations("Common");
  const home = await getTranslations("Home");
  const galleryImages = await getHomeGalleryImages();

  return (
    <main className="min-h-screen">
      <Header
        homeHref={`/${locale}`}
        cartHref={`/${locale}/cart`}
        labels={{
          siteName: common("siteName"),
          cart: common("cart")
        }}
      />
      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 lg:grid-cols-[1fr_420px] lg:items-start">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            {home("eyebrow")}
          </p>
          <h1 className="text-4xl font-semibold text-slate-950">
            {home("title")}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            {home("description")}
          </p>
          <div className="mt-4 rounded border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">
              {home("contact")}
            </h2>
            <div className="mt-3 grid gap-2">
              <p>
                <span className="font-semibold text-slate-900">Instagram: </span>
                <a
                  href="https://www.instagram.com/wangchi.2004/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-700 underline-offset-4 hover:underline"
                >
                  @wangchi.2004
                </a>
              </p>
              <p>
                <span className="font-semibold text-slate-900">WeChat: </span>
                qtd018
              </p>
              <p>
                <span className="font-semibold text-slate-900">WhatsApp: </span>
                <a
                  href="https://wa.me/85256976770"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-700 underline-offset-4 hover:underline"
                >
                  +852 5697 6770
                </a>
              </p>
            </div>
          </div>
          <Link
            href={`/${locale}/samples`}
            className="mt-2 inline-flex h-11 w-fit items-center justify-center rounded border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
          >
            {home("viewSamples")}
          </Link>
        </div>
        <div>
          <h2 className="mb-3 text-xl font-semibold text-slate-950">
            {home("enterTitle")}
          </h2>
          <p className="mb-4 text-sm text-slate-600">
            {home("enterDescription")}
          </p>
          <GeneralOrderEntryForm
            redirectTo={`/${locale}/order/general`}
            labels={{
              email: common("email"),
              country: common("country"),
              button: home("enterButton"),
              emailPlaceholder: home("emailPlaceholder"),
              countryPlaceholder: home("countryPlaceholder"),
              emailError: home("emailError"),
              countryError: home("countryError")
            }}
          />
        </div>
      </section>
      <HomePhotoWall
        images={galleryImages}
        labels={{
          title: home("photoWallTitle"),
          description: home("photoWallDescription"),
          close: home("photoWallClose")
        }}
      />
      {locale === "ko" ? <KoreanShippingNotice /> : null}
    </main>
  );
}

function KoreanShippingNotice() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-16">
      <div className="rounded border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-950">
          한국 고객 주문 및 배송 안내
        </h2>
        <div className="mt-5 space-y-6 text-sm leading-7 text-slate-700">
          <div>
            <p>
              저희는 신발 밑창, 고무판, 가죽, 메쉬 원단, 신발끈, 인솔 및
              각종 신발 수선 재료를 장기적으로 공급하고 있습니다.
            </p>
            <p className="mt-2">
              한국의 구두 수선점, 신발 수선 업체, 신발 재료 판매점 및 관련
              업체와의 장기 협력을 환영합니다.
            </p>
            <p className="mt-2">
              제품 주문을 원하시면 이메일 또는 Instagram으로 문의해 주세요.
              제품, 수량, 가격을 확인한 후 주문 견적을 안내해 드리겠습니다.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-950">수령 정보 안내</h3>
            <p className="mt-2">
              원활한 배송 준비를 위해 아래 수령 정보를 제공해 주세요.
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>수령인 성함</li>
              <li>연락처</li>
              <li>상세 수령 주소</li>
              <li>우편번호</li>
              <li>개인통관고유부호</li>
            </ol>
            <p className="mt-2">
              한국 수입 통관 시 개인통관고유부호가 필요합니다. 통관 및 배송
              지연을 방지하기 위해 정확한 정보를 제공해 주세요.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-950">배송 안내</h3>
            <p className="mt-2">
              한국으로 발송되는 상품은 일반적으로 CJ대한통운을 이용합니다.
            </p>
            <div className="mt-2 grid gap-1">
              <p>
                <span className="font-semibold text-slate-950">택배사:</span>{" "}
                CJ대한통운 / CJ Logistics
              </p>
              <p>
                <span className="font-semibold text-slate-950">
                  예상 배송 기간:
                </span>{" "}
                발송 후 약 12-15 영업일
              </p>
            </div>
            <p className="mt-2">
              상품 발송 후 보통 약 5 영업일 내에 한국 세관에 도착합니다.
              상품이 한국 세관에 도착한 후 CJ대한통운 운송장 번호를 안내해
              드리며, 언제든지 배송 상태를 조회하실 수 있습니다.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-950">
              배송비 참고 안내
            </h3>
            <p className="mt-2">
              한국 배송비는 상품의 무게, 부피, 품목 및 포장 방식에 따라 달라질
              수 있습니다. 아래 금액은 참고용입니다.
            </p>
            <div className="mt-2 grid gap-1">
              <p>약 1kg: 약 11달러</p>
              <p>약 10kg: 약 29달러</p>
            </div>
            <p className="mt-2">
              실제 배송비는 최종 주문 상품의 무게, 부피 및 제품 종류에 따라
              결정됩니다. 일부 특수 소재 제품이나 부피가 큰 상품의 경우 배송비가
              조정될 수 있습니다.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-950">결제 안내</h3>
            <p className="mt-2">결제 방식: PayPal</p>
            <p>
              PayPal 계정:{" "}
              <a
                href="mailto:wangchi.2004@gmail.com"
                className="text-blue-700 underline-offset-4 hover:underline"
              >
                wangchi.2004@gmail.com
              </a>
            </p>
            <p className="mt-2">
              결제 확인 후 최대한 빠르게 상품 준비 및 발송을 진행하겠습니다.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-950">연락처</h3>
            <p className="mt-2">
              제품 문의, 가격 상담 또는 장기 거래를 원하시면 언제든지 연락해
              주세요.
            </p>
            <div className="mt-2 grid gap-1">
              <p>담당자: Wang Chi / 王驰</p>
              <p>
                Email:{" "}
                <a
                  href="mailto:wangchi.2004@gmail.com"
                  className="text-blue-700 underline-offset-4 hover:underline"
                >
                  wangchi.2004@gmail.com
                </a>
              </p>
              <p>
                Website:{" "}
                <a
                  href="https://www.wangchi2004.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-700 underline-offset-4 hover:underline"
                >
                  https://www.wangchi2004.com
                </a>
              </p>
              <p>
                Instagram:{" "}
                <a
                  href="https://www.instagram.com/wangchi.2004/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-700 underline-offset-4 hover:underline"
                >
                  https://www.instagram.com/wangchi.2004/
                </a>
              </p>
            </div>
            <p className="mt-2">
              한국의 구두 수선점, 신발 재료 판매점 및 신발 수선 업계 고객과의
              장기 협력을 환영합니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

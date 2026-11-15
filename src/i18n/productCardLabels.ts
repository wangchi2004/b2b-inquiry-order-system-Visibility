import en from '../../messages/en.json';
import zh from '../../messages/zh.json';
import ja from '../../messages/ja.json';
import ko from '../../messages/ko.json';
export function productCardLabels(locale: string) {
  const copy = ({ en, zh, ja, ko } as Record<string, typeof en>)[locale] ?? en;
  const common = copy.Common, catalog = copy.Catalog;
  return {
    addToInquiryList: common.addToInquiryList, viewDetails: common.viewDetails,
    product: common.product, color: catalog.color, material: catalog.material,
    moq: catalog.moq, sizeRange: catalog.sizeRange, size: common.size,
    price: catalog.price, pricePending: catalog.pricePending,
    selectQuantityBySize: catalog.selectQuantityBySize, selected: catalog.selected,
    noVariants: catalog.noVariants, added: catalog.added, enterQuantity: catalog.enterQuantity,
  };
}

export type Lang = "sv" | "en";
export const LANGS: Lang[] = ["sv", "en"];

/** Text fields of a product that exist once per language. */
export type ProductText = {
  name: string;
  tagline: string;
  description: string;
  priceNote: string;
  category: string;
  material: string;
  dimensions: string;
  leadTime: string;
};

export type Product = {
  id: string;
  slug: string;
  /** null = price on request */
  price: number | null;
  images: string[];
  colors: string[];
  instagram: string;
  featured: boolean;
  published: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  sv: ProductText;
  en: ProductText;
};

export type InquiryStatus = "ny" | "pågår" | "klar" | "arkiverad";

export type Inquiry = {
  id: string;
  createdAt: string;
  lang: Lang;
  name: string;
  email: string;
  phone: string;
  productSlug: string;
  quantity: string;
  message: string;
  files: string[];
  status: InquiryStatus;
  notes: string;
};

export type TextItem = { title: string; text: string };
export type FaqItem = { q: string; a: string };

/** Text content of the site that exists once per language. */
export type SettingsText = {
  announcement: string;
  heroTitle: string;
  heroText: string;
  aboutTitle: string;
  aboutText: string;
  services: TextItem[];
  steps: TextItem[];
  faq: FaqItem[];
  policies: TextItem[];
};

export type Settings = {
  brandName: string;
  logo: string;
  instagram: string;
  email: string;
  location: string;
  orgNumber: string;
  sv: SettingsText;
  en: SettingsText;
};

export type Content = {
  settings: Settings;
  products: Product[];
  inquiries: Inquiry[];
};

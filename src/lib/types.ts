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
  /** can be printed in any colour; `colors` are then suggestions */
  allColors: boolean;
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

export type ChatFrom = "visitor" | "admin";

/** One chat message. `id` is its position in the conversation, so clients can ask for "everything after n". */
export type ChatMessage = {
  id: number;
  at: string;
  from: ChatFrom;
  text: string;
  files: string[];
  /** the product the visitor asked about (from "Fråga i chatten" on a product page) */
  product?: ChatProductRef;
};

export type ChatProductRef = { slug: string; name: string; image: string };

export type ChatStatus = "open" | "closed";

export type Conversation = {
  id: string;
  createdAt: string;
  updatedAt: string;
  lang: Lang;
  name: string;
  email: string;
  /** the page the visitor was on when they started the chat */
  page: string;
  status: ChatStatus;
  preview: string;
  lastFrom: ChatFrom | "";
  /** messages from the visitor the admin has not opened yet */
  unreadAdmin: number;
  /** messages from the studio the visitor has not seen yet */
  unreadVisitor: number;
  adminSeenAt: string;
  visitorSeenAt: string;
};

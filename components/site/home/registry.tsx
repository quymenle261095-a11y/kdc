'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

// Critical Above-the-fold component: Direct import để đảm bảo render tức thì không độ trễ
import { HeroRuntimeSection } from './sections/HeroRuntimeSection';

// Dynamic imports with SSR enabled: Next.js vẫn render đầy đủ HTML trên server (0ms SSR & SEO),
// đồng thời tách biệt JS chunks giúp client chỉ tải đúng những section đang được bật trên trang.
const AboutSection = dynamic(
  () => import('../AboutSection').then((mod) => ({ default: mod.AboutSection }))
);
const BlogSection = dynamic(
  () => import('../BlogSection').then((mod) => ({ default: mod.BlogSection }))
);
const BenefitsRuntimeSection = dynamic(
  () => import('./sections/BenefitsRuntimeSection').then((mod) => ({ default: mod.BenefitsRuntimeSection }))
);
const StatsRuntimeSection = dynamic(
  () => import('./sections/StatsRuntimeSection').then((mod) => ({ default: mod.StatsRuntimeSection }))
);
const FaqRuntimeSection = dynamic(
  () => import('./sections/FaqRuntimeSection').then((mod) => ({ default: mod.FaqRuntimeSection }))
);
const CtaRuntimeSection = dynamic(
  () => import('./sections/CtaRuntimeSection').then((mod) => ({ default: mod.CtaRuntimeSection }))
);
const FeaturesRuntimeSection = dynamic(
  () => import('./sections/FeaturesRuntimeSection').then((mod) => ({ default: mod.FeaturesRuntimeSection }))
);
const ClientsRuntimeSection = dynamic(
  () => import('./sections/ClientsRuntimeSection').then((mod) => ({ default: mod.ClientsRuntimeSection }))
);
const ProcessRuntimeSection = dynamic(
  () => import('./sections/ProcessRuntimeSection').then((mod) => ({ default: mod.ProcessRuntimeSection }))
);
const CaseStudySection = dynamic(
  () => import('../CaseStudySection').then((mod) => ({ default: mod.CaseStudySection }))
);
const ContactSection = dynamic(
  () => import('../ContactSection').then((mod) => ({ default: mod.ContactSection }))
);
const TeamSection = dynamic(
  () => import('../TeamSection').then((mod) => ({ default: mod.TeamSection }))
);
const PricingSection = dynamic(
  () => import('../PricingSection').then((mod) => ({ default: mod.PricingSection }))
);
const ServiceListSection = dynamic(
  () => import('../ServiceListSection').then((mod) => ({ default: mod.ServiceListSection }))
);
const ProductListSection = dynamic(
  () => import('../ProductListSection').then((mod) => ({ default: mod.ProductListSection }))
);
const ProductGridSection = dynamic(
  () => import('../ProductGridSection').then((mod) => ({ default: mod.ProductGridSection }))
);
const HomepageCategoryHeroSection = dynamic(
  () => import('../HomepageCategoryHeroSection').then((mod) => ({ default: mod.HomepageCategoryHeroSection }))
);
const VoucherPromotionsSection = dynamic(
  () => import('../VoucherPromotionsSection').then((mod) => ({ default: mod.VoucherPromotionsSection }))
);
const VideoRuntimeSection = dynamic(
  () => import('./sections/VideoRuntimeSection').then((mod) => ({ default: mod.VideoRuntimeSection }))
);

// Dynamic imports: Chỉ áp dụng cho các widget tương tác client-only hoặc nặng
const CustomHomeRuntimeSection = dynamic(
  () => import('./sections/CustomHomeRuntimeSection').then((mod) => ({ default: mod.CustomHomeRuntimeSection })),
  { ssr: false, loading: () => null }
);
const PokemonChampionsRuntimeSection = dynamic(
  () => import('./sections/PokemonChampionsRuntimeSection').then((mod) => ({ default: mod.PokemonChampionsRuntimeSection })),
  { ssr: false, loading: () => null }
);
const CareerSection = dynamic(
  () => import('../CareerSection').then((mod) => ({ default: mod.CareerSection })),
  { ssr: false, loading: () => null }
);
const CountdownSectionWrapper = dynamic(
  () => import('../CountdownSectionWrapper').then((mod) => ({ default: mod.CountdownSectionWrapper })),
  { ssr: false, loading: () => null }
);
const PopupSection = dynamic(
  () => import('../PopupSection').then((mod) => ({ default: mod.PopupSection })),
  { ssr: false, loading: () => null }
);
const SpeedDialSection = dynamic(
  () => import('../SpeedDialSection').then((mod) => ({ default: mod.SpeedDialSection })),
  { ssr: false, loading: () => null }
);

export const homeComponentRegistry: Record<string, ComponentType<any>> = {
  About: AboutSection,
  Blog: BlogSection,
  Benefits: BenefitsRuntimeSection,
  Career: CareerSection,
  CaseStudy: CaseStudySection,
  Clients: ClientsRuntimeSection,
  Contact: ContactSection,
  Countdown: CountdownSectionWrapper,
  CTA: CtaRuntimeSection,
  CustomHome: CustomHomeRuntimeSection,
  FAQ: FaqRuntimeSection,
  Features: FeaturesRuntimeSection,
  Hero: HeroRuntimeSection,
  HomepageCategoryHero: HomepageCategoryHeroSection,
  PokemonChampions: PokemonChampionsRuntimeSection,
  Pricing: PricingSection,
  Popup: PopupSection,
  Process: ProcessRuntimeSection,
  Stats: StatsRuntimeSection,
  ProductGrid: ProductGridSection,
  ProductList: ProductListSection,
  ServiceList: ServiceListSection,
  SpeedDial: SpeedDialSection,
  Team: TeamSection,
  Video: VideoRuntimeSection,
  VoucherPromotions: VoucherPromotionsSection,
};

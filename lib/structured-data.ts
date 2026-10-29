import {
  FAQ,
  LICENSE_URL,
  MAKERS,
  ORG_NAME,
  ORG_URL,
  REPO_URL,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  STEPS,
  absoluteUrl,
} from "@/lib/site";

const ORG_ID = `${SITE_URL}/#organization`;
const SITE_ID = `${SITE_URL}/#website`;
const APP_ID = `${SITE_URL}/#app`;

export function siteGraph(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: ORG_NAME,
        url: ORG_URL,
        logo: absoluteUrl("/brand/logo-mark-512.png"),
        sameAs: [REPO_URL],
        founder: MAKERS.map((name) => ({ "@type": "Person", name })),
      },
      {
        "@type": "WebSite",
        "@id": SITE_ID,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "en",
        publisher: { "@id": ORG_ID },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "WebApplication",
        "@id": APP_ID,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        description: SITE_DESCRIPTION,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
        browserRequirements: "Requires JavaScript.",
        isAccessibleForFree: true,
        license: LICENSE_URL,
        image: absoluteUrl("/opengraph-image"),
        screenshot: absoluteUrl("/brand/preview.png"),
        codeRepository: REPO_URL,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        author: MAKERS.map((name) => ({ "@type": "Person", name })),
        publisher: { "@id": ORG_ID },
        featureList: ["Match", "Explain", "Review", "FirstPRbot"],
      },
    ],
  };
}

export function faqPage(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function howTo(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to make your first open-source pull request with FirstPR",
    description: "Find a beginner issue, understand which files it touches, then check your own pull request before a maintainer does.",
    tool: [{ "@type": "HowToTool", name: "A GitHub account" }],
    step: STEPS.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
      url: absoluteUrl(step.path),
    })),
  };
}

export function breadcrumbs(items: { name: string; path: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

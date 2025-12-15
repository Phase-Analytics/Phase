import type { JsonLdData } from '@/lib/seo';

type JsonLdProps = {
  data: JsonLdData | JsonLdData[];
};

export function JsonLd({ data }: JsonLdProps) {
  const jsonLdArray = Array.isArray(data) ? data : [data];

  return (
    <>
      {jsonLdArray.map((item, index) => (
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: <>
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
          key={`jsonld-${item['@type']}-${index}`}
          type="application/ld+json"
        />
      ))}
    </>
  );
}

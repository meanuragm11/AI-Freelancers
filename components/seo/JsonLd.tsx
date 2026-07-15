type JsonLdValue = Record<string, unknown>;

type JsonLdProps = {
  data: JsonLdValue | JsonLdValue[];
};

export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

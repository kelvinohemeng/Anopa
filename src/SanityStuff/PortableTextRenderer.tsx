import { PortableText } from "@portabletext/react";
import { urlFor } from "./sanityClient";

interface Props {
  value: any;
}

export default function PortableTextRenderer({ value }: Props) {
  return (
    <PortableText
      value={value}
      components={{
        types: {
          image: ({ value }) => (
            <img
              src={urlFor(value).width(800).url()}
              alt={value.alt || " "}
              style={{ borderRadius: "8px", margin: "1rem 0" }}
            />
          ),
        },
        marks: {
          link: ({ children, value }) => {
            const target = value?.href?.startsWith("http")
              ? "_blank"
              : undefined;
            return (
              <a
                href={value?.href}
                target={target}
                rel={target === "_blank" ? "noopener noreferrer" : undefined}
                style={{ color: "#0070f3", textDecoration: "underline" }}
              >
                {children}
              </a>
            );
          },
        },
        block: {
          h1: ({ children }) => (
            <h1 style={{ fontSize: "2rem" }}>{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 style={{ fontSize: "1.5rem" }}>{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 style={{ fontSize: "1.25rem" }}>{children}</h3>
          ),
          blockquote: ({ children }) => (
            <blockquote
              style={{
                borderLeft: "3px solid #ccc",
                paddingLeft: "1rem",
                fontStyle: "italic",
              }}
            >
              {children}
            </blockquote>
          ),
        },
      }}
    />
  );
}

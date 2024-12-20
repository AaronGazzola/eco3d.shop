import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

export type ButtonProps = {
  text: string;
  href: string;
  style?: "primary" | "secondary" | "destructive" | "outline";
};

type EmailTemplateProps = {
  preview?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  buttons?: ButtonProps[];
};

export default function EmailTemplate({
  preview,
  title,
  subtitle,
  children,
  buttons,
}: EmailTemplateProps) {
  const getButtonStyle = (style: ButtonProps["style"] = "primary") => {
    const baseStyle = {
      padding: "12px 24px",
      borderRadius: "6px",
      textDecoration: "none",
      textAlign: "center" as const,
      display: "inline-block",
      marginRight: "12px",
      fontSize: "16px",
      fontWeight: 500,
    };

    const styles = {
      primary: {
        ...baseStyle,
        background: "hsl(141, 71%, 29%)",
        color: "#FFFFFF",
      },
      secondary: {
        ...baseStyle,
        background: "#E2E8F0",
        color: "#1E293B",
      },
      destructive: {
        ...baseStyle,
        background: "#EF4444",
        color: "#FFFFFF",
      },
      outline: {
        ...baseStyle,
        border: "1px solid #CBD5E1",
        color: "#1E293B",
      },
    };

    return styles[style];
  };

  return (
    <Html>
      <Head />
      <Preview>{preview || title}</Preview>
      <Tailwind>
        <Body style={{ backgroundColor: "#F8FAFC" }}>
          <Container style={{ padding: "40px 20px", textAlign: "center" }}>
            <Section
              style={{
                backgroundColor: "#FFFFFF",
                padding: "40px",
                maxWidth: "580px",
                margin: "0 auto",
              }}
            >
              <Text
                style={{
                  fontSize: "24px",
                  fontWeight: 600,
                  lineHeight: "32px",
                  color: "#0F172A",
                  marginBottom: subtitle ? "8px" : "24px",
                  textAlign: "center",
                }}
              >
                {title}
              </Text>

              {subtitle && (
                <Text
                  style={{
                    fontSize: "16px",
                    color: "#475569",
                    marginBottom: "24px",
                    textAlign: "center",
                  }}
                >
                  {subtitle}
                </Text>
              )}

              {children}

              {buttons && buttons.length > 0 && (
                <Section style={{ marginTop: "32px", textAlign: "center" }}>
                  {buttons.map((button, index) => (
                    <Button
                      key={index}
                      href={button.href}
                      style={getButtonStyle(button.style)}
                    >
                      {button.text}
                    </Button>
                  ))}
                </Section>
              )}
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

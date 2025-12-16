import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

type PasswordResetEmailProps = {
  resetUrl: string;
};

export function PasswordResetEmail({ resetUrl }: PasswordResetEmailProps) {
  return (
    <Html lang="en">
      <Head>
        <title>Reset your password | Phase Analytics</title>
      </Head>
      <Preview>Reset your password for Phase Analytics</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img
              alt="Phase"
              height="48"
              src="https://phase.sh/logo.png"
              style={logo}
              width="48"
            />
          </Section>

          <Heading style={heading}>Reset your password</Heading>

          <Text style={subtitle}>
            Please reset your password by clicking the button below.
          </Text>

          <Section style={buttonContainer}>
            <Button href={resetUrl} style={button}>
              Reset password
            </Button>
          </Section>

          <Section style={fallbackBox}>
            <Text style={linkFallback}>
              Or copy and paste this link into your browser:
            </Text>
            <Link href={resetUrl} style={fallbackLink}>
              {resetUrl}
            </Link>
          </Section>

          <Hr style={divider} />

          <Text style={footer}>
            This link will expire in 1 hour for security reasons. If you didn't
            request this password reset, you can safely ignore this email.
          </Text>

          <Section style={linksSection}>
            <Link href="https://phase.sh" style={footerLink}>
              Website
            </Link>
            <Text style={linkDivider}>•</Text>
            <Link href="https://phase.sh/dashboard" style={footerLink}>
              Dashboard
            </Link>
          </Section>

          <Text style={copyright}>
            © 2025 Phase Analytics. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#fafafa',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  padding: '40px 20px',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '48px 40px',
  maxWidth: '560px',
};

const logoSection = {
  marginBottom: '32px',
};

const logo = {
  display: 'block',
};

const heading = {
  color: '#2e2e2e',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.3',
  margin: '0 0 12px 0',
};

const subtitle = {
  color: '#8e8e8e',
  fontSize: '16px',
  lineHeight: '1.5',
  margin: '0 0 32px 0',
};

const buttonContainer = {
  marginBottom: '24px',
};

const button = {
  backgroundColor: '#000000',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '500',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
  lineHeight: '1.5',
};

const fallbackBox = {
  backgroundColor: '#f8f8f8',
  border: '1px solid #ebebeb',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '32px',
};

const linkFallback = {
  color: '#8e8e8e',
  fontSize: '13px',
  lineHeight: '1.6',
  margin: '0 0 8px 0',
};

const fallbackLink = {
  color: '#2e2e2e',
  fontSize: '13px',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
  display: 'block',
};

const divider = {
  borderColor: '#ebebeb',
  borderTop: '1px solid #ebebeb',
  margin: '32px 0',
};

const footer = {
  color: '#8e8e8e',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 24px 0',
};

const linksSection = {
  textAlign: 'center' as const,
  marginBottom: '16px',
};

const footerLink = {
  color: '#2e2e2e',
  fontSize: '14px',
  textDecoration: 'none',
  display: 'inline-block',
  margin: '0 8px',
};

const linkDivider = {
  color: '#d1d1d1',
  fontSize: '14px',
  display: 'inline-block',
  margin: '0 4px',
};

const copyright = {
  color: '#b5b5b5',
  fontSize: '12px',
  textAlign: 'center' as const,
  margin: '0',
};

export default PasswordResetEmail;

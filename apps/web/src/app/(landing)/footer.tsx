type FooterProps = {
  logo: React.ReactNode;
  brandName: string;
  socialLinks: Array<{
    icon: React.ReactNode;
    href: string;
    label: string;
  }>;
  mainLinks: Array<{
    href: string;
    label: string;
  }>;
  legalLinks: Array<{
    href: string;
    label: string;
  }>;
  copyright: {
    text: React.ReactNode;
    license?: string;
  };
  email?: {
    address: string;
    icon: React.ReactNode;
  };
  status?: {
    href: string;
    label: string;
  };
};

export function Footer({
  logo,
  brandName,
  socialLinks,
  mainLinks,
  legalLinks,
  copyright,
  email,
  status,
}: FooterProps) {
  return (
    <footer className="pt-8 pb-6 lg:pt-12 lg:pb-8">
      <div className="mx-auto w-full max-w-5xl px-4 lg:px-8">
        <div className="md:flex md:items-center md:justify-between">
          <a
            aria-label={brandName}
            className="flex items-center gap-x-2"
            href="/"
          >
            {logo}
          </a>
          <ul className="mt-4 flex list-none space-x-6 md:mt-0">
            {socialLinks.map((link) => (
              <li key={link.href}>
                <a
                  aria-label={link.label}
                  className="flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
                  href={link.href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {link.icon}
                  <span>{link.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-6 border-t pt-6 md:mt-4 md:pt-8 lg:grid lg:grid-cols-10">
          <nav className="lg:col-[4/11] lg:mt-0">
            <ul className="-my-1 -mx-2 flex list-none flex-wrap lg:justify-end">
              {mainLinks.map((link) => (
                <li className="mx-2 my-1 shrink-0" key={link.href}>
                  <a
                    className="text-primary text-sm underline-offset-4 hover:underline hover:decoration-orange-500"
                    href={link.href}
                    {...(link.href.startsWith('http') && {
                      rel: 'noopener noreferrer',
                      target: '_blank',
                    })}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-6 lg:col-[4/11] lg:mt-0">
            <ul className="-my-1 -mx-3 flex list-none flex-wrap lg:justify-end">
              {legalLinks.map((link) => (
                <li className="mx-3 my-1 shrink-0" key={link.href}>
                  <a
                    className="text-muted-foreground text-sm underline-offset-4 hover:underline hover:decoration-orange-500"
                    href={link.href}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-6 space-y-2 text-sm leading-6 lg:col-[1/4] lg:row-[1/3] lg:mt-0">
            {status && (
              <a
                className="flex items-center gap-2 text-sm underline-offset-4 hover:underline hover:decoration-orange-500"
                href={status.href}
                rel="noopener noreferrer"
                target="_blank"
              >
                <div className="relative flex size-[14px] items-center justify-center">
                  <span className="absolute inline-flex size-2 animate-ping rounded-full bg-success" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-success" />
                </div>
                {status.label}
              </a>
            )}
            {email && (
              <a
                className="flex items-center gap-2 text-sm underline-offset-4 hover:underline hover:decoration-orange-500"
                href={`mailto:${email.address}`}
              >
                {email.icon}
                {email.address}
              </a>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-center whitespace-nowrap text-center text-muted-foreground text-xs">
          {copyright.text}
          {copyright.license && <div>{copyright.license}</div>}
        </div>
      </div>
    </footer>
  );
}

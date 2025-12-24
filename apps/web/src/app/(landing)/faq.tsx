'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question:
      'How is Phase Analytics different from other analytics platforms?',
    answer:
      'Phase Analytics is built specifically for mobile developers (React Native, Swift, Expo) with a privacy-first approach. Unlike traditional platforms, we store all data in GDPR-compliant EU data centers (Germany), never sell your data, and collect zero PII by default.',
  },
  {
    question: 'Where is my application data stored?',
    answer:
      "All data is stored in Falkenstein, Germany, in secure, GDPR-compliant data centers. We prioritize data sovereignty and use industry-standard encryption (AES-256 at rest) to ensure your users' privacy.",
  },
  {
    question: 'Can Phase Analytics track events while the user is offline?',
    answer:
      'Yes. Our SDKs include built-in offline support. Events are securely queued locally (using AsyncStorage or UserDefaults) and automatically synced once the device regains internet connectivity.',
  },
  {
    question: 'How does automatic screen tracking work?',
    answer:
      'Integration is seamless. For Expo and React Native, simply enable "trackNavigation" in our Provider and pass the navigation ref to automatically capture screen views. For Swift, use our ".phaseScreen()" modifier to track navigation changes with minimal code.',
  },
  {
    question: 'What are your data retention policies?',
    answer:
      'We maintain a strict 1-year retention policy for all data. Analytics data (events, sessions, screen views) is automatically deleted 12 months after collection, helping you remain compliant with GDPR "right to be forgotten" principles.',
  },
  {
    question: 'Is it really "Privacy-First"?',
    answer:
      'Absolutely. Our SDKs collect zero PII by default and use locally generated IDs. All data collection is optional and developer-controlled: you can disable device metadata, opt-out of server-side geolocation, and decide exactly which custom user properties to track based on your own privacy policy and user consent.',
  },
];

export function FAQ() {
  return (
    <section
      className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-8 lg:py-12"
      id="faq"
    >
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="mb-3 font-semibold text-lg text-muted-foreground uppercase">
            Phase Analytics FAQ
          </h2>
        </div>
        <Accordion className="w-full" collapsible type="single">
          {faqs.map((faq) => (
            <AccordionItem key={faq.question} value={faq.question}>
              <AccordionTrigger className="py-4 text-left font-semibold text-base transition-colors hover:text-orange-500 hover:no-underline md:text-lg">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="pb-6 text-muted-foreground text-sm md:text-base">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

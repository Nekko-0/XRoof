import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export const metadata = {
  title: "Privacy Policy | XRoof",
  description: "XRoof privacy policy — how we collect, use, and protect your data.",
}

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h1
            className="text-3xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: March 24, 2026
          </p>

          <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">1. Introduction</h2>
              <p>
                XRoof (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the XRoof platform at xroof.io. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">2. Information We Collect</h2>
              <p className="mb-2"><strong className="text-foreground">Account Information:</strong> When you create an account, we collect your name, email address, phone number, company name, and service area.</p>
              <p className="mb-2"><strong className="text-foreground">Business Data:</strong> Information you enter into the platform including customer names, addresses, job details, estimates, contracts, invoices, and photos.</p>
              <p className="mb-2"><strong className="text-foreground">Payment Information:</strong> Payment processing is handled by Stripe. We do not store credit card numbers on our servers. Stripe&apos;s privacy policy governs payment data.</p>
              <p className="mb-2"><strong className="text-foreground">Usage Data:</strong> We automatically collect information about how you interact with the platform, including pages visited, features used, and device information.</p>
              <p><strong className="text-foreground">Communications:</strong> Messages sent through the customer portal, SMS messages sent via Twilio, and emails sent via Resend are processed through third-party services.</p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">3. Homeowner Data Collected Through Contractor Landing Pages</h2>
              <p className="mb-2">
                XRoof provides a landing page builder that roofing contractors use to collect leads from homeowners. When a homeowner submits a form on a contractor&apos;s landing page, we collect the homeowner&apos;s name, phone number, email address (if provided), property address, city, ZIP code, and project type.
              </p>
              <p className="mb-2">
                <strong className="text-foreground">Data Controller:</strong> The roofing contractor who created the landing page is the data controller for homeowner data collected through their pages. The contractor determines how this data is used and is responsible for complying with all applicable data protection and communication laws.
              </p>
              <p className="mb-2">
                <strong className="text-foreground">Data Processor:</strong> XRoof acts as a data processor, storing and transmitting homeowner data on behalf of the contractor. We process this data solely to operate the Service — storing leads, notifying the contractor, and enabling the contractor to follow up.
              </p>
              <p className="mb-2">
                <strong className="text-foreground">No Sale of Data:</strong> XRoof does not sell, rent, or share homeowner data with any third parties beyond what is necessary to operate the Service (see Section 5 below).
              </p>
              <p>
                <strong className="text-foreground">Deletion Requests:</strong> Homeowners may request deletion of their personal data by contacting{" "}
                <a href="mailto:support@xroof.io" className="text-primary hover:underline">support@xroof.io</a>.
                We will process deletion requests within 30 days.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">4. How We Use Your Information</h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>To provide and maintain the XRoof platform</li>
                <li>To process transactions and send related information (estimates, invoices, contracts)</li>
                <li>To send automated follow-up emails and SMS on your behalf</li>
                <li>To provide customer support</li>
                <li>To send service-related announcements and updates</li>
                <li>To monitor platform usage and improve our services</li>
                <li>To detect and prevent fraud or abuse</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">5. Data Sharing and Sub-Processors</h2>
              <p className="mb-2">We do not sell your personal information. We share data only with the following service providers (sub-processors):</p>
              <ul className="list-disc space-y-1 pl-5">
                <li><strong className="text-foreground">Supabase:</strong> Database hosting, authentication, and storage of all platform data including homeowner lead data collected through contractor landing pages</li>
                <li><strong className="text-foreground">Stripe:</strong> Payment processing for contractor subscriptions</li>
                <li><strong className="text-foreground">Resend:</strong> Email delivery for contractor communications and automated follow-ups, including emails sent to homeowner leads</li>
                <li><strong className="text-foreground">Twilio:</strong> SMS delivery for contractor notifications and automated messages, including SMS sent to homeowner leads</li>
                <li><strong className="text-foreground">Google Maps/Satellite:</strong> Satellite imagery for roof measurements</li>
                <li><strong className="text-foreground">Vercel:</strong> Application hosting</li>
              </ul>
              <p className="mt-2">We may also disclose information if required by law or to protect the rights and safety of our users.</p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">6. Data Security</h2>
              <p>
                We implement industry-standard security measures including encrypted connections (HTTPS/TLS), authenticated API access with JWT tokens, and role-based access controls. However, no method of electronic transmission or storage is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">7. Data Retention</h2>
              <p>
                We retain your account data for as long as your account is active. Business data (jobs, estimates, invoices) is retained for the duration of your subscription plus 90 days after cancellation. You may request deletion of your data at any time by contacting us.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">8. Your Rights</h2>
              <p className="mb-2">You have the right to:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Access the personal data we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Export your data in a portable format</li>
                <li>Opt out of marketing communications</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">9. Cookies</h2>
              <p>
                We use essential cookies for authentication (Supabase session tokens stored in localStorage). We do not use third-party tracking cookies or advertising cookies.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">10. Children&apos;s Privacy</h2>
              <p>
                XRoof is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">11. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the &ldquo;Last updated&rdquo; date.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">12. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy, please contact us at{" "}
                <a href="mailto:support@xroof.io" className="text-primary hover:underline">
                  support@xroof.io
                </a>.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

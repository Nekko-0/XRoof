import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export const metadata = {
  title: "Terms of Service | XRoof",
  description: "XRoof terms of service — the agreement governing your use of the XRoof platform.",
}

export default function TermsOfServicePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h1
            className="text-3xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: March 24, 2026
          </p>

          <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
              <p>
                By creating an account or using XRoof (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. These terms constitute a legally binding agreement between you and XRoof.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">2. Description of Service</h2>
              <p>
                XRoof is a software-as-a-service (SaaS) platform designed for roofing contractors. The Service includes lead management, satellite roof measurement, estimate and proposal generation, contract e-signing, invoice and payment collection, customer portal, automated follow-ups, team management, and analytics.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">3. Account Registration</h2>
              <p className="mb-2">
                You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account.
              </p>
              <p>
                You must be at least 18 years old and have the legal authority to enter into contracts on behalf of your business to use XRoof.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">4. Subscription and Payment</h2>
              <p className="mb-2">
                XRoof offers monthly and annual subscription plans. Prices are listed on our pricing page and may be updated with 30 days&apos; notice. All fees are non-refundable except as required by law.
              </p>
              <p className="mb-2">
                Your subscription renews automatically at the end of each billing period. You may cancel at any time through the billing settings page. Cancellation takes effect at the end of the current billing period.
              </p>
              <p>
                Payment processing is handled by Stripe. By subscribing, you also agree to Stripe&apos;s terms of service.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">5. Acceptable Use</h2>
              <p className="mb-2">You agree not to:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Use the Service for any illegal purpose</li>
                <li>Send spam, unsolicited messages, or harassing communications through the platform</li>
                <li>Attempt to gain unauthorized access to other users&apos; accounts or data</li>
                <li>Reverse engineer, decompile, or disassemble the Service</li>
                <li>Use the Service to collect personal information without the consent of the data subjects</li>
                <li>Resell, sublicense, or redistribute access to the Service without written permission</li>
                <li>Display false claims of licensing, insurance, bonding, certifications, or qualifications on your XRoof landing pages or profile. Misrepresenting your credentials constitutes a material breach of these Terms and will result in immediate account termination without refund.</li>
                <li>Display fake reviews, testimonials, or endorsements; use photos, logos, or content you do not have the right to use; impersonate another business or individual; make false claims about competitors; display pricing or offers that are intentionally misleading; collect personal information from minors; or use landing pages for any purpose other than legitimate lead generation for your roofing business.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">5.5 Landing Pages and Lead Generation</h2>
              <p className="mb-2">
                XRoof provides a landing page builder that allows contractors to create lead capture pages. Contractors are solely responsible for all content displayed on their landing pages, including but not limited to business claims, licensing status, insurance status, reviews, testimonials, pricing, service descriptions, and trust badges.
              </p>
              <p className="mb-2">
                XRoof does not verify the accuracy of any information contractors place on their landing pages. Contractors represent and warrant that all information displayed on their landing pages is truthful, accurate, and not misleading.
              </p>
              <p className="mb-2">
                Contractors are solely responsible for ensuring their landing pages comply with all applicable laws, including the Federal Trade Commission Act, state consumer protection laws, and any industry-specific regulations.
              </p>
              <p className="mb-2">
                Contractors who display false or misleading information on their landing pages, including false claims of licensing, insurance, or certifications, will have their landing pages deactivated and may have their accounts terminated without refund.
              </p>
              <p>
                XRoof reserves the right to review, deactivate, or remove any landing page that it believes, in its sole discretion, contains false, misleading, or harmful content.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">6. Your Data</h2>
              <p className="mb-2">
                You retain ownership of all data you enter into XRoof, including customer information, job data, photos, estimates, contracts, and invoices (&ldquo;Your Data&rdquo;).
              </p>
              <p className="mb-2">
                You grant XRoof a limited license to store, process, and display Your Data as necessary to provide the Service. We will not use Your Data for any purpose other than operating the Service.
              </p>
              <p>
                You are responsible for ensuring you have the right to enter customer data into the platform and for complying with applicable data protection laws.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">7. Electronic Signatures</h2>
              <p>
                XRoof provides e-signature functionality for contracts between you and your customers. By using this feature, you acknowledge that electronic signatures created through XRoof are legally binding under the Electronic Signatures in Global and National Commerce Act (ESIGN Act) and the Uniform Electronic Transactions Act (UETA). XRoof is not responsible for the content or enforceability of contracts between you and your customers.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">8. SMS and Email Communications</h2>
              <p className="mb-2">
                XRoof enables you to send emails and SMS messages to your customers. You are solely responsible for ensuring compliance with the Telephone Consumer Protection Act (TCPA), CAN-SPAM Act, and any other applicable communication laws. You must obtain proper consent before sending automated messages and provide opt-out mechanisms as required by law.
              </p>
              <p className="mb-2">
                For leads generated through XRoof landing pages, contractors must ensure that the landing page includes a clear, conspicuous consent disclosure that names the contractor&apos;s business and specifies the types of communications (phone, email, SMS) the homeowner consents to receive. This consent must comply with the FCC&apos;s one-to-one consent rule and all applicable TCPA regulations.
              </p>
              <p className="mb-2">
                XRoof provides default consent language on landing pages as a convenience. Contractors are responsible for verifying that the consent language on their landing pages meets all legal requirements for their jurisdiction and business model.
              </p>
              <p>
                Contractors agree to indemnify XRoof for any TCPA claims, fines, or damages arising from communications sent to leads collected through their XRoof landing pages.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">9. Satellite Imagery</h2>
              <p>
                Roof measurements made using satellite imagery are estimates only. XRoof does not guarantee the accuracy of satellite-derived measurements. You are responsible for verifying measurements before using them in proposals or contracts.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">10. Limitation of Liability</h2>
              <p className="mb-2">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, XROOF SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
              </p>
              <p>
                OUR TOTAL LIABILITY FOR ANY CLAIM ARISING FROM THESE TERMS OR YOUR USE OF THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID TO XROOF IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">11. Disclaimer of Warranties</h2>
              <p>
                THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">12. Indemnification</h2>
              <p className="mb-2">
                You agree to indemnify and hold harmless XRoof and its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including reasonable attorneys&apos; fees) arising from your use of the Service, your violation of these Terms, or your violation of any third-party rights.
              </p>
              <p>
                Without limiting the generality of the foregoing, contractors specifically agree to indemnify and hold harmless XRoof from any claims, damages, losses, or expenses arising from: (a) false, misleading, or inaccurate information displayed on contractor landing pages, including but not limited to false claims of licensing, insurance, certifications, reviews, or qualifications; (b) communications sent to homeowners or leads collected through XRoof landing pages that violate TCPA, CAN-SPAM, or any other applicable communication law; (c) any harm, property damage, personal injury, or financial loss suffered by a homeowner as a result of work performed by the contractor or the contractor&apos;s failure to perform work; (d) any violation of state contractor licensing, insurance, or consumer protection laws.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">13. Termination</h2>
              <p className="mb-2">
                We may suspend or terminate your account if you violate these Terms or for any other reason with 30 days&apos; notice. You may terminate your account at any time by canceling your subscription and contacting support.
              </p>
              <p>
                Upon termination, your right to use the Service ceases immediately. We will retain Your Data for 90 days after termination, after which it may be permanently deleted.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">14. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the State of Wisconsin, without regard to conflict of law principles. Any disputes arising from these Terms shall be resolved in the courts of Milwaukee County, Wisconsin.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">15. Changes to Terms</h2>
              <p>
                We reserve the right to update these Terms at any time. Material changes will be communicated via email or a prominent notice on the platform at least 30 days before they take effect. Continued use of the Service after changes take effect constitutes acceptance of the revised Terms.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">16. Intellectual Property and DMCA</h2>
              <p className="mb-2">
                You represent that you own or have the right to use all content uploaded to XRoof, including photos, logos, and text. You agree not to upload copyrighted material without authorization.
              </p>
              <p className="mb-2">
                If you believe content on XRoof infringes your copyright, you may submit a DMCA takedown notice to{" "}
                <a href="mailto:support@xroof.io" className="text-primary hover:underline">support@xroof.io</a>{" "}
                with the following information: identification of the copyrighted work, identification of the infringing material and its location on our platform, your contact information, a statement of good faith belief that the use is not authorized, a statement under penalty of perjury that the information is accurate, and your physical or electronic signature.
              </p>
              <p>
                We will respond to valid DMCA notices within 10 business days. XRoof reserves the right to remove infringing content and terminate accounts of repeat infringers.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">17. Contact</h2>
              <p>
                For questions about these Terms, contact us at{" "}
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

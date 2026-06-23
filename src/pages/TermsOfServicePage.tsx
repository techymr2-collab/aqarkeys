import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export function TermsOfServicePage() {
  return (
    <LegalPage title="Terms of Service" updated="23 June 2026">
      <p>
        These Terms of Service ("Terms") govern access to and use of Aqarkeys (the
        "Service"), provided to property management agencies, property owners, and
        tenants operating in the United Arab Emirates. By creating an account or using
        the Service, you agree to these Terms on behalf of yourself and, if applicable,
        the organization you represent.
      </p>

      <LegalSection title="1. Who can use Aqarkeys">
        <p>
          The Service is intended for property management agencies ("Managers") and the
          property owners and tenants they invite ("Owners" and "Tenants"). You must be
          at least 18 years old and able to form a binding contract to create an account.
          A Manager is responsible for the accuracy of the information they enter and for
          the conduct of any team member or invited Owner/Tenant they grant access to.
        </p>
      </LegalSection>

      <LegalSection title="2. Your account">
        <p>
          You are responsible for keeping your login credentials confidential and for all
          activity under your account. Tell us immediately if you suspect unauthorized
          access. We may suspend an account that we reasonably believe has been
          compromised or is being used to violate these Terms.
        </p>
      </LegalSection>

      <LegalSection title="3. Your data, and ours">
        <p>
          Data you enter — properties, units, leases, tenants, owners, invoices,
          maintenance records, documents, and similar records ("Customer Data") — remains
          yours. We do not sell Customer Data and only access it to operate, support, and
          improve the Service, or as required by law.
        </p>
        <p>
          You're responsible for having the right to enter the personal data of owners,
          tenants, and other individuals into the Service, and for handling that data in
          line with applicable law, including the UAE's Personal Data Protection Law
          (Federal Decree-Law No. 45 of 2021).
        </p>
      </LegalSection>

      <LegalSection title="4. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Use the Service for any unlawful purpose or to violate any third party's rights;</li>
          <li>Attempt to access another organization's data without authorization;</li>
          <li>Reverse engineer, scrape, or resell the Service without our written consent;</li>
          <li>Upload malicious code or attempt to disrupt or overload the Service;</li>
          <li>Misrepresent your identity or your authority to act for an organization.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Owner and tenant portal access">
        <p>
          A Manager may invite Owners and Tenants to a scoped, read-oriented portal tied
          to their own properties, leases, and invoices. Managers are responsible for
          inviting the correct individuals and for revoking access when a lease or
          ownership relationship ends.
        </p>
      </LegalSection>

      <LegalSection title="6. Subscriptions and fees">
        <p>
          Where the Service is offered under a paid plan, fees, billing frequency, and
          payment terms are set out separately at sign-up or in a written agreement.
          Continuing to use the Service after a fee change takes effect constitutes
          acceptance of the new fee.
        </p>
      </LegalSection>

      <LegalSection title="7. Suspension and termination">
        <p>
          You may stop using the Service and close your account at any time. We may
          suspend or terminate access for a material breach of these Terms, non-payment,
          or where required by law, generally with notice unless the situation requires
          immediate action to protect the Service or other users.
        </p>
      </LegalSection>

      <LegalSection title="8. Disclaimers">
        <p>
          The Service is provided "as is." We do not warrant that it will be
          uninterrupted or error-free. Aqarkeys is a record-keeping and workflow tool — it
          does not provide legal, tax, or accounting advice, and a Manager remains
          responsible for complying with EJARI registration, VAT, and other regulatory
          obligations in their emirate.
        </p>
      </LegalSection>

      <LegalSection title="9. Limitation of liability">
        <p>
          To the maximum extent permitted by law, Aqarkeys will not be liable for
          indirect, incidental, or consequential damages arising from use of the Service.
          Our total liability for any claim relating to the Service is limited to the
          amount you paid us in the twelve months preceding the claim.
        </p>
      </LegalSection>

      <LegalSection title="10. Governing law">
        <p>
          These Terms are governed by the laws of the United Arab Emirates. Any dispute
          arising from these Terms will be subject to the exclusive jurisdiction of the
          competent courts of the UAE, without prejudice to any mandatory free-zone
          arbitration or dispute-resolution regime that may apply.
        </p>
      </LegalSection>

      <LegalSection title="11. Changes to these Terms">
        <p>
          We may update these Terms from time to time. We'll update the date at the top
          of this page, and for material changes we'll provide reasonable notice before
          they take effect.
        </p>
      </LegalSection>

      <LegalSection title="12. Contact">
        <p>Questions about these Terms can be sent to your Aqarkeys account contact.</p>
      </LegalSection>
    </LegalPage>
  );
}

import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="23 June 2026">
      <p>
        This Privacy Policy explains what personal data Aqarkeys collects, how it's used,
        and the choices you have. It applies to Managers, Owners, and Tenants using the
        Service.
      </p>

      <LegalSection title="1. Information we collect">
        <p>We collect information in a few ways:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Account information</strong> — name, email, phone, role, and the
            organization you belong to;
          </li>
          <li>
            <strong>Property and tenancy records</strong> entered by a Manager — property
            and unit details, lease terms, rent and invoice records, post-dated cheque and
            EJARI details, maintenance requests, and uploaded documents;
          </li>
          <li>
            <strong>Usage data</strong> — log-in activity and basic interaction data we use
            to keep the Service secure and working correctly.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. How we use this information">
        <p>We use the information above to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Provide the core features of the Service — invoicing, leasing, maintenance, portals, and reporting;</li>
          <li>Authenticate accounts and enforce access scoped to your organization;</li>
          <li>Send service-related notices (e.g. invitation emails, password resets);</li>
          <li>Maintain security, prevent abuse, and meet legal obligations.</li>
        </ul>
        <p>We do not use Customer Data to train third-party AI models, and we do not sell personal data.</p>
      </LegalSection>

      <LegalSection title="3. Who can see what">
        <p>
          Access is scoped by role. A Manager sees their organization's full portfolio.
          An Owner sees only the properties they own and statements derived from them. A
          Tenant sees only their own lease, invoices, and maintenance history. This
          separation is enforced at the database level, not just in the interface.
        </p>
      </LegalSection>

      <LegalSection title="4. Where data is stored">
        <p>
          Customer Data is stored with our infrastructure provider, Supabase (built on
          PostgreSQL), with access controlled by row-level security policies and
          encrypted in transit. Documents you upload (lease agreements, photos, etc.) are
          stored in access-controlled cloud storage tied to your organization.
        </p>
      </LegalSection>

      <LegalSection title="5. Sharing of information">
        <p>We share personal data only:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>With infrastructure providers who process it on our behalf under confidentiality obligations (e.g. hosting, database, email delivery);</li>
          <li>When required by law, regulation, or a valid legal request;</li>
          <li>With your consent, or at your direction (e.g. a Manager inviting an Owner or Tenant to a portal).</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Data retention">
        <p>
          We retain Customer Data for as long as the related account is active, and for a
          reasonable period after closure to meet legal, accounting, or dispute-resolution
          needs. A Manager can request deletion of their organization's data, subject to
          any retention we're required to keep by law.
        </p>
      </LegalSection>

      <LegalSection title="7. Your rights">
        <p>
          Depending on your role and applicable law — including the UAE's Personal Data
          Protection Law (Federal Decree-Law No. 45 of 2021) — you may have the right to
          access, correct, or request deletion of your personal data. Owners and Tenants
          should generally direct these requests to the Manager whose organization
          invited them, as the Manager controls that data; Managers can contact us
          directly.
        </p>
      </LegalSection>

      <LegalSection title="8. Cookies and similar technology">
        <p>
          We use essential cookies/local storage to keep you signed in and to remember
          interface preferences (such as which notifications you've already seen). We do
          not use third-party advertising trackers.
        </p>
      </LegalSection>

      <LegalSection title="9. Children's privacy">
        <p>The Service is intended for business use by adults and is not directed at children.</p>
      </LegalSection>

      <LegalSection title="10. Changes to this policy">
        <p>
          We may update this policy as the Service evolves. We'll update the date at the
          top of this page, and provide reasonable notice for material changes.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact">
        <p>Questions about this policy can be sent to your Aqarkeys account contact.</p>
      </LegalSection>
    </LegalPage>
  );
}

export interface FixtureDescriptor {
  id: string;
  title: string;
  path: string;
  description: string;
  category: "phishing" | "cloaking" | "benign" | "brand_impersonation";
  variants: {
    crawler: { expectedStatus: number; summary: string };
    desktop: { expectedStatus: number; summary: string };
    mobileEmulated: { expectedStatus: number; summary: string };
  };
  targetReceiverPath?: string;
  expectedVerdict: string;
  tags: string[];
}

export const FIXTURE_MANIFEST: FixtureDescriptor[] = [
  {
    id: "scholarship-phish",
    title: "University Scholarship Verification Phish",
    path: "/fixtures/scholarship",
    description: "Simulated credential phishing claiming to verify scholarship funds. Attempts form submission to mock receiver.",
    category: "phishing",
    variants: {
      crawler: { expectedStatus: 200, summary: "Presents form requesting student ID and campus credentials." },
      desktop: { expectedStatus: 200, summary: "Full desktop form with deceptive university branding." },
      mobileEmulated: { expectedStatus: 200, summary: "Mobile optimized login view." }
    },
    targetReceiverPath: "/receiver/canary",
    expectedVerdict: "action_concern_supported",
    tags: ["credential_harvesting", "brand_impersonation", "synthetic_probe"]
  },
  {
    id: "cloaked-portal",
    title: "User-Agent Cloaked Portal",
    path: "/fixtures/cloaked",
    description: "Returns 403 Forbidden to automated crawlers, but serves a deceptive credential form to mobile browser user-agents.",
    category: "cloaking",
    variants: {
      crawler: { expectedStatus: 403, summary: "Access Denied - Security Check" },
      desktop: { expectedStatus: 200, summary: "Maintenance page with no credentials requested." },
      mobileEmulated: { expectedStatus: 200, summary: "Urgent mobile verification form with password and OTP inputs." }
    },
    targetReceiverPath: "/receiver/canary",
    expectedVerdict: "action_concern_supported",
    tags: ["cloaking_difference", "conditional_content"]
  },
  {
    id: "benign-portal",
    title: "Official Student Affairs Portal",
    path: "/fixtures/benign-portal",
    description: "Legitimate university informational and login portal with verified domain alignment and expected flow.",
    category: "benign",
    variants: {
      crawler: { expectedStatus: 200, summary: "Official portal home." },
      desktop: { expectedStatus: 200, summary: "Official desktop portal." },
      mobileEmulated: { expectedStatus: 200, summary: "Responsive mobile portal." }
    },
    expectedVerdict: "expected_flow_supported",
    tags: ["benign", "expected_flow"]
  },
  {
    id: "brand-clone",
    title: "State Bank Visual Brand Clone",
    path: "/fixtures/brand-clone",
    description: "Replicates bank color scheme and logo text on an unrelated test host without delegated authority.",
    category: "brand_impersonation",
    variants: {
      crawler: { expectedStatus: 200, summary: "Cloned login interface." },
      desktop: { expectedStatus: 200, summary: "Desktop online banking replica." },
      mobileEmulated: { expectedStatus: 200, summary: "Mobile banking replica." }
    },
    targetReceiverPath: "/receiver/canary",
    expectedVerdict: "action_concern_supported",
    tags: ["brand_impersonation", "visual_similarity"]
  },
  {
    id: "synthetic-inbox",
    title: "Campus Webmail Synthetic Inbox",
    path: "/fixtures/synthetic-inbox",
    description: "Simulated webmail environment with benign institutional messages and an urgent phishing lure with link.",
    category: "phishing",
    variants: {
      crawler: { expectedStatus: 200, summary: "Webmail view with message stream." },
      desktop: { expectedStatus: 200, summary: "Standard webmail view." },
      mobileEmulated: { expectedStatus: 200, summary: "Responsive webmail view." }
    },
    targetReceiverPath: "/receiver/canary",
    expectedVerdict: "action_concern_supported",
    tags: ["extension_intake", "in_context_email", "phishing_lure"]
  },
  {
    id: "synthetic-chat",
    title: "Campus Connect Synthetic Chat",
    path: "/fixtures/synthetic-chat",
    description: "Simulated chat thread with benign conversational bubbles and an urgent credential security alert.",
    category: "phishing",
    variants: {
      crawler: { expectedStatus: 200, summary: "Chat stream with message bubbles." },
      desktop: { expectedStatus: 200, summary: "Standard chat stream." },
      mobileEmulated: { expectedStatus: 200, summary: "Mobile chat stream." }
    },
    targetReceiverPath: "/receiver/canary",
    expectedVerdict: "action_concern_supported",
    tags: ["extension_intake", "in_context_chat", "phishing_lure"]
  },
  {
    id: "credential-harvest",
    title: "IT Helpdesk SSO Verification Phish",
    path: "/fixtures/credential-harvest",
    description: "Fake Single Sign-On login demanding immediate institutional password and MFA token to avert account deactivation.",
    category: "phishing",
    variants: {
      crawler: { expectedStatus: 200, summary: "Fake SSO portal with password and MFA fields." },
      desktop: { expectedStatus: 200, summary: "Standard corporate SSO replica." },
      mobileEmulated: { expectedStatus: 200, summary: "Mobile optimized SSO login view." }
    },
    targetReceiverPath: "/receiver/canary",
    expectedVerdict: "action_concern_supported",
    tags: ["credential_harvesting", "mfa_phish", "urgency_pressure"]
  },
  {
    id: "payment-fraud",
    title: "Urgent Wire & Cryptocurrency Overdue Invoice",
    path: "/fixtures/payment-fraud",
    description: "High-pressure invoice scam claiming past due penalty fees with crypto wallet address and routing credentials.",
    category: "phishing",
    variants: {
      crawler: { expectedStatus: 200, summary: "Urgent invoice with payment countdown." },
      desktop: { expectedStatus: 200, summary: "Desktop invoice review portal." },
      mobileEmulated: { expectedStatus: 200, summary: "Mobile invoice payment view." }
    },
    targetReceiverPath: "/receiver/canary",
    expectedVerdict: "action_concern_supported",
    tags: ["payment_fraud", "invoice_scam", "wire_lure"]
  },
  {
    id: "fake-update",
    title: "Critical Browser Security Update Lure",
    path: "/fixtures/fake-update",
    description: "Deceptive system notification warning of zero-day vulnerabilities urging immediate download of an executable patch.",
    category: "phishing",
    variants: {
      crawler: { expectedStatus: 200, summary: "Fake browser security alert." },
      desktop: { expectedStatus: 200, summary: "High-urgency browser patch warning." },
      mobileEmulated: { expectedStatus: 200, summary: "Mobile OS update alert." }
    },
    targetReceiverPath: "/receiver/canary",
    expectedVerdict: "action_concern_supported",
    tags: ["fake_update", "malware_lure", "drive_by_phish"]
  },
  {
    id: "gift-card-scam",
    title: "$500 Gift Card Reward Survey Scam",
    path: "/fixtures/gift-card-scam",
    description: "Prize lottery lure promising an instant $500 gift card upon submission of student ID, SSN, and phone PIN.",
    category: "phishing",
    variants: {
      crawler: { expectedStatus: 200, summary: "Prize claim portal." },
      desktop: { expectedStatus: 200, summary: "Desktop reward claim interface." },
      mobileEmulated: { expectedStatus: 200, summary: "Mobile reward voucher view." }
    },
    targetReceiverPath: "/receiver/canary",
    expectedVerdict: "action_concern_supported",
    tags: ["lottery_scam", "identity_theft", "pin_harvesting"]
  },
  {
    id: "qr-phish",
    title: "2FA Reset QR Code Phishing Portal",
    path: "/fixtures/qr-phish",
    description: "Phishing lure presenting a deceptive QR code claiming to sync university multi-factor authentication tokens.",
    category: "phishing",
    variants: {
      crawler: { expectedStatus: 200, summary: "QR code synchronization portal." },
      desktop: { expectedStatus: 200, summary: "Desktop QR authenticator setup view." },
      mobileEmulated: { expectedStatus: 200, summary: "Mobile QR authenticator setup view." }
    },
    targetReceiverPath: "/receiver/canary",
    expectedVerdict: "action_concern_supported",
    tags: ["qr_phish", "mfa_bypass", "quishing"]
  },
  {
    id: "ceo-fraud",
    title: "Executive Whaling & Gift Card Memo",
    path: "/fixtures/ceo-fraud",
    description: "Impersonates the University Chancellor / Dean requesting immediate confidential phone contact and purchase.",
    category: "phishing",
    variants: {
      crawler: { expectedStatus: 200, summary: "Confidential executive request memo." },
      desktop: { expectedStatus: 200, summary: "Desktop executive memo notice." },
      mobileEmulated: { expectedStatus: 200, summary: "Mobile executive memo view." }
    },
    targetReceiverPath: "/receiver/canary",
    expectedVerdict: "action_concern_supported",
    tags: ["whaling", "executive_impersonation", "social_engineering"]
  },
  {
    id: "brand-clone-apex",
    title: "Apex Financial Brand Clone Portal",
    path: "/fixtures/brand-clone-apex",
    description: "Impersonates Apex Financial services branding and client login styling on an unauthorized test domain.",
    category: "brand_impersonation",
    variants: {
      crawler: { expectedStatus: 200, summary: "Apex Financial replica portal." },
      desktop: { expectedStatus: 200, summary: "Full desktop replica with gold/navy theme." },
      mobileEmulated: { expectedStatus: 200, summary: "Mobile banking portal replica." }
    },
    targetReceiverPath: "/receiver/canary",
    expectedVerdict: "action_concern_supported",
    tags: ["brand_impersonation", "apex_financial", "financial_phish"]
  },
  {
    id: "benign-research",
    title: "Department of Computer Science Research Lab",
    path: "/fixtures/benign-research",
    description: "Official university research laboratory page with faculty publications, seminar schedules, and clean outbound links.",
    category: "benign",
    variants: {
      crawler: { expectedStatus: 200, summary: "Academic lab portal with verified citations." },
      desktop: { expectedStatus: 200, summary: "Standard desktop academic department portal." },
      mobileEmulated: { expectedStatus: 200, summary: "Responsive mobile academic page." }
    },
    expectedVerdict: "expected_flow_supported",
    tags: ["benign", "academic_portal", "expected_flow"]
  }
];

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
  }
];

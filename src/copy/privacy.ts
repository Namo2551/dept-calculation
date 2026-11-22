// Privacy notice (Thailand PDPA). Plain language; the owner should review it before launch.
export const privacyCopy = {
  title: "Privacy notice",
  updated: "Last updated: 22 November 2026",
  intro:
    "Paydown helps you plan and track debt repayment. This notice explains what personal data we keep, why, and the rights you have under Thailand's Personal Data Protection Act B.E. 2562 (PDPA).",
  sections: [
    {
      title: "What we collect",
      body: [
        "Account data: your email address, an optional display name, and your password (stored only as a secure hash by our authentication provider).",
        "Financial data you enter: debts, balances, interest rates, payment plans, payments you record, notes and goals.",
        "Technical data needed to keep you signed in: a session cookie. We don't use advertising or analytics trackers.",
        "Nothing is collected when you use the calculator without an account; its numbers stay in your browser.",
      ],
    },
    {
      title: "Why we use it",
      body: [
        "Only to provide the service you asked for: saving your plans and debts, calculating progress, and showing your dashboard. Our legal basis is your consent, which you give when you create an account.",
        "We never sell your data or use it for advertising.",
      ],
    },
    {
      title: "Where it is stored",
      body: [
        "In a Supabase database in the Southeast Asia (Singapore) region, protected by row-level security so each account can only read its own rows. The website is hosted on Netlify.",
      ],
    },
    {
      title: "Sharing",
      body: [
        "Your data is private. It is only shown to someone else if you create a private share link, and only the parts you choose. You can revoke a link at any time.",
      ],
    },
    {
      title: "How long we keep it",
      body: ["Until you delete it or delete your account. Deleting your account removes all of your data immediately."],
    },
    {
      title: "Your rights",
      body: [
        "You can see, correct and delete your data at any time in the app, download a copy of all of it (Account > Download my data), withdraw consent by deleting your account, and complain to Thailand's Personal Data Protection Committee.",
      ],
    },
    {
      title: "Contact",
      body: ["For any privacy question or request, contact the site owner through the GitHub repository linked in the footer."],
    },
  ],
} as const;

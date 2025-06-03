// components/PrivacyPolicyScreen.tsx
import React from 'react';

const PrivacyPolicyScreen: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto p-4 text-slate-800">
      <h1 className="text-2xl font-bold mb-4">Privacy Policy</h1>
      <p className="mb-4">
        Gage collects basic personal information such as your email address, date of birth, and gameplay data (your guesses and scores).
      </p>
      <p className="mb-4">
        This information may be used for product improvement, analytics, and marketing purposes. We may send you updates or insights using the email provided. We may share anonymized or aggregated insights publicly.
      </p>
      <p className="mb-4">
        We do not sell your personal information. You may request data deletion by contacting us at support@gagetheage.com.
      </p>
      <p>
        This policy is subject to change. Continued use of the service implies acceptance of any changes.
      </p>
    </div>
  );
};

export default PrivacyPolicyScreen;

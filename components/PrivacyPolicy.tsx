import React from 'react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 text-slate-800 bg-white rounded-md shadow-md mt-10">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

      <p className="mb-4">
        This Privacy Policy explains how Gage ("we", "us", or "our") collects, uses, shares, and protects the personal information of users who use our application.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Information We Collect</h2>
      <ul className="list-disc list-inside mb-4">
        <li>Email address (via Google sign-in)</li>
        <li>Date of birth (used to calculate your age)</li>
        <li>Your GAGE score (your guessing game performance)</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">How We Use Your Information</h2>
      <p className="mb-4">
        We use your information to operate and improve the Gage experience, including:
      </p>
      <ul className="list-disc list-inside mb-4">
        <li>Personalizing gameplay and tracking your progress</li>
        <li>Improving our product based on usage insights</li>
        <li>Potentially contacting you with product updates or relevant marketing (you may opt out)</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">Data Sharing</h2>
      <p className="mb-4">
        We may share anonymized and aggregated data publicly or with partners. Personally identifiable information (like email or exact age) will only be shared with your consent or when legally required.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Your Rights</h2>
      <p className="mb-4">
        You can request to view, modify, or delete your data at any time by contacting us.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Contact</h2>
      <p>
        For any privacy-related questions, reach out to us at: <strong>hello@gagetheage.com</strong>
      </p>
    </div>
  );
};

export default PrivacyPolicy;

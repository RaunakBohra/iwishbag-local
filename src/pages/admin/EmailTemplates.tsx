import React from "react";
import EmailTemplateManager from "@/components/admin/EmailTemplateManager";

const EmailTemplatesPage = () => {
  return (
    <div className="container py-8 space-y-8">
      <h1 className="text-3xl font-bold">Email Templates</h1>
      <EmailTemplateManager />
    </div>
  );
};

export default EmailTemplatesPage; 
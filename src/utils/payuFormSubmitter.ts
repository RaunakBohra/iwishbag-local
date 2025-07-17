// PayU Form Submission Utility
// This handles form submission with multiple fallback methods

export interface PayUFormData {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  surl: string;
  furl: string;
  hash: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
}

export class PayUFormSubmitter {
  private static createFormHTML(url: string, formData: PayUFormData): string {
    const fields = Object.entries(formData)
      .map(([key, value]) => `<input type="hidden" name="${key}" value="${value || ''}" />`)
      .join('\n    ');

    return `
      <form id="payuForm" method="POST" action="${url}" target="_self">
        ${fields}
        <div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
          <h3 style="margin: 0 0 10px 0; color: #333;">Redirecting to PayU...</h3>
          <p style="margin: 0 0 15px 0; color: #666;">Please wait while we redirect you to PayU payment page.</p>
          <button type="submit" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
            Continue to PayU Payment
          </button>
          <p style="margin: 15px 0 0 0; font-size: 12px; color: #888;">
            If you are not redirected automatically, click the button above.
          </p>
        </div>
      </form>
    `;
  }

  static submitWithVisibleForm(url: string, formData: PayUFormData): void {
    console.log('🔄 PayU Form Submitter: Creating visible form');

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'payuOverlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '9999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';

    // Create form container
    const container = document.createElement('div');
    container.style.backgroundColor = '#f0f8ff';
    container.style.padding = '20px';
    container.style.borderRadius = '10px';
    container.style.border = '2px solid #4CAF50';
    container.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    container.style.maxWidth = '400px';
    container.style.width = '90%';

    // Set form HTML
    container.innerHTML = this.createFormHTML(url, formData);

    overlay.appendChild(container);
    document.body.appendChild(overlay);

    // Auto-submit after 2 seconds
    setTimeout(() => {
      const form = document.getElementById('payuForm') as HTMLFormElement;
      if (form) {
        console.log('🚀 Auto-submitting PayU form');
        form.submit();
      }
    }, 2000);

    // Clean up function
    const cleanup = () => {
      const existingOverlay = document.getElementById('payuOverlay');
      if (existingOverlay) {
        existingOverlay.remove();
      }
    };

    // Clean up after 10 seconds (in case something goes wrong)
    setTimeout(cleanup, 10000);
  }

  static submitWithNewWindow(url: string, formData: PayUFormData): void {
    console.log('🔄 PayU Form Submitter: Opening new window');

    const formHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>PayU Payment</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
          .container { max-width: 400px; margin: 50px auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        </style>
      </head>
      <body>
        <div class="container">
          ${this.createFormHTML(url, formData)}
        </div>
        <script>
          // Auto-submit after 2 seconds
          setTimeout(() => {
            document.getElementById('payuForm').submit();
          }, 2000);
        </script>
      </body>
      </html>
    `;

    const newWindow = window.open('', '_blank', 'width=500,height=400');
    if (newWindow) {
      newWindow.document.write(formHTML);
      newWindow.document.close();
    } else {
      console.error('Failed to open new window for PayU payment');
      // Fallback to visible form
      this.submitWithVisibleForm(url, formData);
    }
  }

  static submitWithRedirect(url: string, formData: PayUFormData): void {
    console.log('🔄 PayU Form Submitter: Direct redirect');

    // Create form and submit immediately
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = url;
    form.target = '_self';
    form.style.display = 'none';

    // Add all fields
    Object.entries(formData).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value || '';
      form.appendChild(input);
    });

    document.body.appendChild(form);

    // Submit immediately
    form.submit();
  }

  static submit(
    url: string,
    formData: PayUFormData,
    method: 'visible' | 'redirect' | 'newWindow' = 'visible',
  ): void {
    console.log(`🎯 PayU Form Submitter: Using ${method} method`);

    try {
      switch (method) {
        case 'visible':
          this.submitWithVisibleForm(url, formData);
          break;
        case 'newWindow':
          this.submitWithNewWindow(url, formData);
          break;
        case 'redirect':
          this.submitWithRedirect(url, formData);
          break;
        default:
          this.submitWithVisibleForm(url, formData);
      }
    } catch (error) {
      console.error('PayU Form Submitter error:', error);
      // Fallback to visible form
      this.submitWithVisibleForm(url, formData);
    }
  }
}

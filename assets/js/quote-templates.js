// Initialize template dropdown on load and ensure functions are globally available
document.addEventListener('DOMContentLoaded', () => {
    updateTemplateDropdown();
    window.saveQuoteTemplatePrompt = saveQuoteTemplatePrompt;
});

// Assume calculateVolumetricWeight, updateWeightLabel, updateWeights, autoPopulateSalesTax, and validateQuoteForm are available from assets/quote-calculator.js and assets/scripts.js
function loadQuoteTemplate(templateName) {
    if (!templateName) return;
    const templates = JSON.parse(localStorage.getItem('quoteTemplates') || '{}');
    const template = templates[templateName];
    if (template) {
        document.getElementById('quoteCountrySelect').value = template.country || '';
        document.getElementById('grossWeight').value = template.grossWeight || '';
        document.getElementById('itemPrice').value = template.itemPrice || '';
        document.getElementById('customsCategory').value = template.customsCategory || '';
        document.getElementById('salesTaxPrice').value = template.salesTaxPrice || '0';
        document.getElementById('merchantShippingPrice').value = template.merchantShippingPrice || '';
        document.getElementById('domesticShipping').value = template.domesticShipping || '';
        document.getElementById('handlingCharge').value = template.handlingCharge || '';
        document.getElementById('discount').value = template.discount || '';
        document.getElementById('insuranceAmount').value = template.insuranceAmount || '';
        updateWeightLabel(); // Update weight unit labels based on country
        updateWeights();     // Update volumetric and effective weights
        const country = document.getElementById('quoteCountrySelect').value;
        const productPrice = document.getElementById('itemPrice').value;
        autoPopulateSalesTax(country, productPrice); // Auto-populate sales tax based on country settings
        console.log('Loaded template:', templateName, template);
    } else {
        console.error('Template not found:', templateName);
    }
}

function saveQuoteTemplatePrompt() {
    if (!validateQuoteForm()) return; // Ensure form is valid before saving
    const templateName = prompt('Enter a name for this template (e.g., Electronics Default):');
    if (templateName) {
        saveQuoteTemplate(templateName);
    }
    // Ensure this function is globally available
    window.saveQuoteTemplatePrompt = saveQuoteTemplatePrompt;
}

function saveQuoteTemplate(templateName) {
    const formData = new FormData(document.getElementById('quoteForm'));
    const data = Object.fromEntries(formData.entries());
    const template = {
        country: data.country,
        grossWeight: parseFloat(data.grossWeight) || 0,
        itemPrice: parseFloat(data.itemPrice) || 0,
        customsCategory: data.customsCategory,
        salesTaxPrice: parseFloat(data.salesTaxPrice) || 0, // Save current sales tax (auto-populated or manual)
        merchantShippingPrice: parseFloat(data.merchantShippingPrice) || 0,
        domesticShipping: parseFloat(data.domesticShipping) || 0,
        handlingCharge: parseFloat(data.handlingCharge) || 0,
        discount: parseFloat(data.discount) || 0,
        insuranceAmount: parseFloat(data.insuranceAmount) || 0
    };
    let templates = JSON.parse(localStorage.getItem('quoteTemplates') || '{}');
    templates[templateName] = template;
    localStorage.setItem('quoteTemplates', JSON.stringify(templates));
    alert(`Template '${templateName}' saved successfully!`);
    updateTemplateDropdown();
    console.log('Saved template:', templateName, template);
}

function updateTemplateDropdown() {
    const select = document.getElementById('quoteTemplate');
    if (!select) {
        console.error('quoteTemplate element not found in DOM');
        return;
    }
    const templates = JSON.parse(localStorage.getItem('quoteTemplates') || '{}');
    select.innerHTML = '<option value="">-- Select Template --</option>';
    for (const name in templates) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    }
}


let countrySettings = JSON.parse(localStorage.getItem('countrySettings')) || {};
let availableSourcingCountries = JSON.parse(localStorage.getItem('availableSourcingCountries')) || {};
let customsCategories = JSON.parse(localStorage.getItem('customsCategories')) || {
    "electronics": 15,
    "clothing": 5,
    "books": 0,
    "furniture": 10
};

console.log('assets/scripts.js loaded successfully');
console.log('Initial customsCategories in scripts.js:', customsCategories);

function populateCountryDropdown(selectId, options, availableOnly = false) {
    const select = document.getElementById(selectId);
    if (!select) {
        console.error(`${selectId} element not found in DOM`);
        return;
    }
    select.innerHTML = '<option value="">-- Select a Country --</option>';
    const countries = availableOnly ? availableSourcingCountries : options;
    for (const country of countries) {
        if (options[country]) {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country; // Show only the country name
            select.appendChild(option);
        }
    }
}

function populateCustomsDropdown() {
    const select = document.getElementById('customsCategory');
    if (!select) {
        console.error('customsCategory element not found in DOM');
        return;
    }
    select.innerHTML = '<option value="">-- Select Category --</option>';
    console.log('Populating customs dropdown with:', customsCategories);
    for (const category in customsCategories) {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category.charAt(0).toUpperCase() + category.slice(1); // Show only the category name
        select.appendChild(option);
    }
}

function updateWeightLabel() {
    const country = document.getElementById('quoteCountrySelect')?.value || '';
    const settings = countrySettings[country] || {};
    const weightUnit = settings.weightUnit || 'lbs';
    const weightUnitLabel = document.getElementById('weightUnitLabel');
    if (weightUnitLabel) {
        weightUnitLabel.textContent = weightUnit;
    } else {
        console.error('weightUnitLabel element not found in DOM');
    }
    const weightLabel = document.getElementById('weightLabel');
    if (weightLabel) {
        weightLabel.textContent = `Gross Weight (${weightUnit}):`;
    } else {
        console.error('weightLabel element not found in DOM');
    }
}

function validateQuoteForm() {
    const country = document.getElementById('quoteCountrySelect').value;
    const grossWeight = parseFloat(document.getElementById('grossWeight').value) || 0;
    const itemPrice = parseFloat(document.getElementById('itemPrice').value) || 0;
    const customsCategory = document.getElementById('customsCategory').value;

    if (!country) {
        alert('Please select a sourcing country.');
        return false;
    }
    if (grossWeight <= 0) {
        alert('Gross weight must be greater than 0.');
        return false;
    }
    if (itemPrice <= 0) {
        alert('Product price must be greater than 0.');
        return false;
    }
    if (!customsCategory) {
        alert('Please select a customs category.');
        return false;
    }
    return true;
}

function loadQuoteTemplate(templateName) {
    if (!templateName) return;
    const templates = JSON.parse(localStorage.getItem('quoteTemplates') || '{}');
    const template = templates[templateName];
    if (template) {
        document.getElementById('quoteCountrySelect').value = template.country || '';
        document.getElementById('grossWeight').value = template.grossWeight || '';
        document.getElementById('itemPrice').value = template.itemPrice || '';
        document.getElementById('customsCategory').value = template.customsCategory || '';
        document.getElementById('salesTaxPrice').value = '0'; // Hardcode sales tax to 0
        updateWeightLabel();
        console.log('Loaded template:', templateName, template);
    } else {
        console.error('Template not found:', templateName);
    }
}

function saveQuoteTemplate(templateName) {
    const formData = new FormData(document.getElementById('quoteForm'));
    const data = Object.fromEntries(formData.entries());
    const template = {
        country: data.country,
        grossWeight: parseFloat(data.grossWeight) || 0,
        itemPrice: parseFloat(data.itemPrice) || 0,
        customsCategory: data.customsCategory
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

function saveCurrentQuote() {
    if (!validateQuoteForm()) return;
    const formData = new FormData(document.getElementById('quoteForm'));
    const data = Object.fromEntries(formData.entries());
    const settings = countrySettings[data.country] || {};
    const quote = calculateShippingQuotes(
        parseFloat(data.grossWeight) || 0, parseFloat(data.itemPrice) || 0, 0, // Sales tax hardcoded to 0
        parseFloat(data.merchantShippingPrice) || 0, parseFloat(data.customsCategory) || 0,
        parseFloat(data.domesticShipping) || 0, parseFloat(data.handlingCharge) || 0,
        parseFloat(data.discount) || 0, parseFloat(data.insuranceAmount) || 0,
        settings
    );
    const savedQuote = {
        quoteId: 'Q' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        ...data,
        quoteDetails: quote
    };
    let savedQuotes = JSON.parse(localStorage.getItem('savedQuotes') || '[]');
    savedQuotes.push(savedQuote);
    localStorage.setItem('savedQuotes', JSON.stringify(savedQuotes));
    alert(`Quote saved successfully! Quote ID: ${savedQuote.quoteId}`);
    showSavedQuotes();
    console.log('Saved quote:', savedQuote);
}

function showSavedQuotes() {
    const savedQuotesDiv = document.getElementById('savedQuotes');
    const quoteList = document.getElementById('quoteList');
    if (savedQuotesDiv && quoteList) {
        savedQuotesDiv.style.display = 'block';
        const quotes = JSON.parse(localStorage.getItem('savedQuotes') || '[]');
        quoteList.innerHTML = quotes.map(quote => `
            <div style="border: 1px solid #ccc; padding: 10px; margin: 5px 0;">
                <p><strong>Quote ID:</strong> ${quote.quoteId}</p>
                <p><strong>Country:</strong> ${quote.country}</p>
                <p><strong>Gross Weight:</strong> ${quote.grossWeight} ${countrySettings[quote.country]?.weightUnit || 'lbs'}</p>
                <p><strong>Product Price:</strong> ${getCurrencySymbol(countrySettings[quote.country]?.currency || 'USD')}${quote.itemPrice.toFixed(2)}</p>
                <p><strong>Customs Category:</strong> ${quote.customsCategory.charAt(0).toUpperCase() + quote.customsCategory.slice(1)}</p>
                <p><strong>Final Total (Source):</strong> ${getCurrencySymbol(countrySettings[quote.country]?.currency || 'USD')}${quote.quoteDetails.finalTotal.toFixed(2)}</p>
                <p><strong>Final Total (NPR):</strong> ${getCurrencySymbol('NPR')}${convertToUserCurrency(quote.quoteDetails, countrySettings[quote.country] || {}, 'NPR').finalTotal.toFixed(2)}</p>
                <p><strong>Timestamp:</strong> ${new Date(quote.timestamp).toLocaleString()}</p>
                <button onclick="loadQuote('${quote.quoteId}')">Load Quote</button>
                <button onclick="deleteQuote('${quote.quoteId}')">Delete</button>
            </div>
        `).join('');
    } else {
        console.error('savedQuotes or quoteList element not found in DOM');
    }
}

function loadQuote(quoteId) {
    const quotes = JSON.parse(localStorage.getItem('savedQuotes') || '[]');
    const quote = quotes.find(q => q.quoteId === quoteId);
    if (quote) {
        document.getElementById('quoteCountrySelect').value = quote.country || '';
        document.getElementById('grossWeight').value = quote.grossWeight || '';
        document.getElementById('itemPrice').value = quote.itemPrice || '';
        document.getElementById('customsCategory').value = quote.customsCategory || '';
        document.getElementById('salesTaxPrice').value = '0'; // Hardcode sales tax to 0
        updateWeightLabel();
        console.log('Loaded quote:', quoteId, quote);
    } else {
        console.error('Quote not found:', quoteId);
    }
}

function deleteQuote(quoteId) {
    let quotes = JSON.parse(localStorage.getItem('savedQuotes') || '[]');
    quotes = quotes.filter(q => q.quoteId !== quoteId);
    localStorage.setItem('savedQuotes', JSON.stringify(quotes));
    showSavedQuotes();
    alert(`Quote ${quoteId} deleted successfully!`);
    console.log('Deleted quote:', quoteId);
}

function showBatchQuoteForm() {
    document.getElementById('batchQuoteForm').style.display = 'block';
}

function hideBatchQuoteForm() {
    document.getElementById('batchQuoteForm').style.display = 'none';
    document.getElementById('batchQuoteForm').reset();
    document.getElementById('batchResults').innerHTML = '';
}

function exportBatchQuotes(results) {
    const csv = [
        'Country,Weight,Price,Category,SourceTotal,NPRTotal',
        ...results.map(r => `${r.country},${r.weight},${r.price},${r.category},${r.sourceTotal},${r.nprTotal}`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'batch_quotes.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    console.log('Exported batch quotes as CSV:', results);
}

document.getElementById('batchQuoteForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateQuoteForm()) return;
    const batchQuotes = document.getElementById('batchQuotes').value.split('\n').map(line => line.trim().split(',')).filter(line => line.length === 4);
    let results = [];
    batchQuotes.forEach(([country, weight, price, category]) => {
        if (!countrySettings[country]) {
            console.error(`Country ${country} not found in settings`);
            return;
        }
        if (!customsCategories[category]) {
            console.error(`Customs category ${category} not found`);
            return;
        }
        const settings = countrySettings[country] || {};
        const weightNum = parseFloat(weight) || 0;
        const priceNum = parseFloat(price) || 0;
        if (weightNum <= 0 || priceNum <= 0) {
            console.error(`Invalid weight or price for ${country}: weight=${weight}, price=${price}`);
            return;
        }
        const quote = calculateShippingQuotes(
            weightNum, priceNum, 0, // Sales tax hardcoded to 0
            0, // Merchant shipping (assume 0 for simplicity)
            parseFloat(customsCategories[category]) || 0,
            0, 0, 0, 0, // Domestic shipping, handling, discount, insurance (assume 0 for simplicity)
            settings
        );
        const userQuote = convertToUserCurrency(quote, settings, 'NPR');
        results.push({
            country, weight: weightNum, price: priceNum, category,
            sourceTotal: quote.finalTotal.toFixed(2),
            nprTotal: userQuote.finalTotal.toFixed(2)
        });
    });
    const batchResults = document.getElementById('batchResults');
    if (batchResults) {
        batchResults.innerHTML = `
            <h4>Batch Quote Results</h4>
            <table border="1" style="border-collapse: collapse; width: 100%; margin-top: 10px;">
                <thead>
                    <tr>
                        <th>Country</th>
                        <th>Weight</th>
                        <th>Price</th>
                        <th>Category</th>
                        <th>Source Total</th>
                        <th>NPR Total</th>
                    </tr>
                </thead>
                <tbody>${results.map(r => `
                    <tr>
                        <td>${r.country}</td>
                        <td>${r.weight}</td>
                        <td>${r.price}</td>
                        <td>${r.category.charAt(0).toUpperCase() + r.category.slice(1)}</td>
                        <td>${getCurrencySymbol(countrySettings[r.country]?.currency || 'USD')}${r.sourceTotal}</td>
                        <td>${getCurrencySymbol('NPR')}${r.nprTotal}</td>
                    </tr>
                `).join('')}</tbody>
            </table>
            <button onclick="exportBatchQuotes(${JSON.stringify(results)})">Export as CSV</button>
        `;
    } else {
        console.error('batchResults element not found in DOM');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, initializing quote calculator');
    populateCountryDropdown('quoteCountrySelect', countrySettings, true);
    populateCustomsDropdown();
    updateTemplateDropdown();

    const quoteCountrySelect = document.getElementById('quoteCountrySelect');
    if (quoteCountrySelect) {
        quoteCountrySelect.addEventListener('change', (e) => {
            updateWeightLabel();
            document.getElementById('salesTaxPrice').value = '0'; // Hardcode sales tax to 0
        });
    } else {
        console.error('quoteCountrySelect element not found in DOM');
    }

    const itemPrice = document.getElementById('itemPrice');
    if (itemPrice) {
        itemPrice.addEventListener('input', (e) => {
            document.getElementById('salesTaxPrice').value = '0'; // Hardcode sales tax to 0
        });
    } else {
        console.error('itemPrice element not found in DOM');
    }

    const quoteForm = document.getElementById('quoteForm');
    if (quoteForm) {
        quoteForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!validateQuoteForm()) return;
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            const sourceSettings = countrySettings[data.country] || {};
            const userBaseCurrency = 'NPR';
            const grossWeight = parseFloat(data.grossWeight) || 0;

            console.log('Form data submitted:', data);
            console.log('Source settings:', sourceSettings);

            const itemPrice = parseFloat(data.itemPrice) || 0;
            const salesTaxPrice = 0; // Hardcode sales tax to 0

            console.log('Calculated values:', { itemPrice, salesTaxPrice, grossWeight });

            const quote = calculateShippingQuotes(
                grossWeight, itemPrice, salesTaxPrice,
                parseFloat(data.merchantShippingPrice) || 0, parseFloat(data.customsCategory) || 0,
                parseFloat(data.domesticShipping) || 0, parseFloat(data.handlingCharge) || 0,
                parseFloat(data.discount) || 0, parseFloat(data.insuranceAmount) || 0, sourceSettings
            );
            console.log('Quote calculated:', quote);

            const userQuote = convertToUserCurrency(quote, sourceSettings, userBaseCurrency);
            console.log('User quote (NPR) calculated:', userQuote);

            const sourceSymbol = getCurrencySymbol(sourceSettings.currency || 'USD');
            const userSymbol = getCurrencySymbol(userBaseCurrency);

            const resultDiv = document.getElementById('result');
            if (resultDiv) {
                resultDiv.innerHTML = `
                    <h3>Quote Results</h3>
                    <p>Approximately it will cost you ${userSymbol}${(userQuote.finalTotal.toFixed(2))}</p>
                    <p>Effective Weight Used: ${grossWeight.toFixed(2)} ${sourceSettings.weightUnit || 'lbs'}</p>
                    <p>Customs Duty: ${customsCategories[data.customsCategory] || 0}% (Category: ${data.customsCategory.charAt(0).toUpperCase() + data.customsCategory.slice(1) || 'None'})</p>
                `;
            } else {
                console.error('result element not found in DOM');
            }
        });
    } else {
        console.error('quoteForm element not found in DOM');
    }
});

function getCurrencySymbol(currency) {
    if (!currency) return '$';
    const symbols = {
        USD: '$',
        NPR: 'NPR',
        INR: '₹',
        CNY: '¥'
    };
    return symbols[currency] || '$';
}
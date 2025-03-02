// Load from localStorage, avoiding duplicate declarations
let countrySettingsData = JSON.parse(localStorage.getItem('countrySettings')) || {};
let availableSourcingCountries = JSON.parse(localStorage.getItem('availableSourcingCountries')) || {};
let customsCategoriesData = JSON.parse(localStorage.getItem('customsCategories')) || {
    "electronics": 15,
    "clothing": 5,
    "books": 0,
    "furniture": 10
};

console.log('assets/scripts.js loaded successfully');
console.log('Initial customsCategories in scripts.js:', customsCategoriesData);

// Function to get or set countrySettings and customsCategories globally
function getCountrySettings(newSettings = null) {
    if (newSettings !== null) {
        countrySettingsData = newSettings;
        localStorage.setItem('countrySettings', JSON.stringify(countrySettingsData));
        console.log('Updated countrySettings:', countrySettingsData);
    }
    return countrySettingsData;
}

function getCustomsCategories(newCategories = null) {
    if (newCategories !== null) {
        customsCategoriesData = newCategories;
        localStorage.setItem('customsCategories', JSON.stringify(customsCategoriesData));
        console.log('Updated customsCategories:', customsCategoriesData);
    }
    return customsCategoriesData;
}

function populateCountryDropdown(selectId, options, availableOnly = false) {
    const select = document.getElementById(selectId);
    if (!select) {
        console.error(`${selectId} element not found in DOM`);
        return;
    }
    select.innerHTML = '<option value="">-- Select a Country --</option>';
    const countries = availableOnly ? availableSourcingCountries : options;
    for (const country of countries) {
        if (getCountrySettings()[country]) {
            const settings = getCountrySettings()[country];
            const option = document.createElement('option');
            option.value = country;
            option.textContent = `${country} (${settings.currency}, ${settings.weightUnit}, Sales Tax: ${settings.salesTax || 0}%, VAT: ${settings.vat || 0}%)`;
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
    console.log('Populating customs dropdown with:', getCustomsCategories());
    for (const category in getCustomsCategories()) {
        const percent = getCustomsCategories()[category];
        const option = document.createElement('option');
        option.value = category;
        option.textContent = `${category.charAt(0).toUpperCase() + category.slice(1)} (${percent}%)`;
        select.appendChild(option);
    }
}

function updateWeightLabel() {
    const country = document.getElementById('quoteCountrySelect')?.value || '';
    const settings = getCountrySettings()[country] || {};
    const weightUnit = settings.weightUnit || 'lbs';
    ['weightUnitLabel', 'weightUnitLabelVol', 'weightUnitLabelEff'].forEach(id => {
        const label = document.getElementById(id);
        if (label) label.textContent = weightUnit;
        else console.error(`${id} element not found in DOM`);
    });
    const weightLabel = document.getElementById('weightLabel');
    if (weightLabel) weightLabel.textContent = `Gross Weight (${weightUnit}):`;
    else console.error('weightLabel element not found in DOM');
}

function autoPopulateSalesTax(country, productPrice) {
    const settings = getCountrySettings()[country] || {};
    const salesTaxPercent = settings.salesTax || 0;
    const salesTaxField = document.getElementById('salesTaxPrice');
    if (!salesTaxField) {
        console.error('salesTaxPrice element not found in DOM');
        return;
    }
    const price = parseFloat(productPrice) || 0;
    if (salesTaxPercent > 0 && price > 0) {
        const salesTaxAmount = (price * (salesTaxPercent / 100)).toFixed(2);
        salesTaxField.value = salesTaxAmount;
        console.log(`Auto-populated sales tax for ${country}: $${salesTaxAmount} (from ${price} * ${salesTaxPercent}%)`);
    } else {
        salesTaxField.value = '';
        console.log(`No sales tax auto-populated for ${country} (salesTaxPercent: ${salesTaxPercent}, productPrice: ${productPrice})`);
    }
}

function updateWeights() {
    const country = document.getElementById('quoteCountrySelect')?.value || '';
    const settings = getCountrySettings()[country] || {};
    // Ensure settings has defaults
    if (!settings) settings = {};
    const weightUnit = settings.weightUnit || 'lbs';
    const divisor = settings.volumetricDivisor !== undefined ? settings.volumetricDivisor : (weightUnit === 'lbs' ? 166 : 6000);
    const grossWeight = parseFloat(document.getElementById('grossWeight').value) || 0;
    const length = parseFloat(document.getElementById('length').value) || 0;
    const width = parseFloat(document.getElementById('width').value) || 0;
    const height = parseFloat(document.getElementById('height').value) || 0;

    let volumetricWeight = 0;
    if (length > 0 && width > 0 && height > 0) {
        volumetricWeight = calculateVolumetricWeight(length, width, height, divisor, weightUnit);
    }
    const volumetricWeightField = document.getElementById('volumetricWeight');
    const effectiveWeightField = document.getElementById('effectiveWeight');

    if (volumetricWeightField) volumetricWeightField.value = volumetricWeight.toFixed(2);
    const effectiveWeight = Math.max(grossWeight, volumetricWeight);
    if (effectiveWeightField) effectiveWeightField.value = effectiveWeight.toFixed(2);

    console.log(`Weights updated: Gross=${grossWeight}, Volumetric=${volumetricWeight}, Effective=${effectiveWeight}`);
    return effectiveWeight;
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

function saveCurrentQuote() {
    if (!validateQuoteForm()) return;
    const formData = new FormData(document.getElementById('quoteForm'));
    const data = Object.fromEntries(formData.entries());
    const settings = getCountrySettings()[data.country] || {};
    const quote = calculateShippingQuotes(
        updateWeights(), parseFloat(data.itemPrice) || 0, parseFloat(data.salesTaxPrice) || 0,
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
                <p><strong>Gross Weight:</strong> ${quote.grossWeight} ${getCountrySettings()[quote.country]?.weightUnit || 'lbs'}</p>
                <p><strong>Product Price:</strong> ${getCurrencySymbol(getCountrySettings()[quote.country]?.currency || 'USD')}${quote.itemPrice.toFixed(2)}</p>
                <p><strong>Customs Category:</strong> ${quote.customsCategory.charAt(0).toUpperCase() + quote.customsCategory.slice(1)}</p>
                <p><strong>Final Total (Source):</strong> ${getCurrencySymbol(getCountrySettings()[quote.country]?.currency || 'USD')}${quote.quoteDetails.finalTotal.toFixed(2)}</p>
                <p><strong>Final Total (NPR):</strong> ${getCurrencySymbol('NPR')}${convertToUserCurrency(quote.quoteDetails, getCountrySettings()[quote.country] || {}, 'NPR').finalTotal.toFixed(2)}</p>
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
        document.getElementById('salesTaxPrice').value = quote.salesTaxPrice || '0';
        document.getElementById('merchantShippingPrice').value = quote.merchantShippingPrice || '';
        document.getElementById('domesticShipping').value = quote.domesticShipping || '';
        document.getElementById('handlingCharge').value = quote.handlingCharge || '';
        document.getElementById('discount').value = quote.discount || '';
        document.getElementById('insuranceAmount').value = quote.insuranceAmount || '';
        updateWeightLabel();
        updateWeights();
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

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, initializing quote calculator');
    populateCountryDropdown('quoteCountrySelect', getCountrySettings(), true);
    populateCustomsDropdown();

    const quoteCountrySelect = document.getElementById('quoteCountrySelect');
    if (quoteCountrySelect) {
        quoteCountrySelect.addEventListener('change', (e) => {
            updateWeightLabel();
            const productPrice = document.getElementById('itemPrice')?.value || '';
            autoPopulateSalesTax(e.target.value, productPrice);
            updateWeights();
        });
    } else {
        console.error('quoteCountrySelect element not found in DOM');
    }

    const itemPrice = document.getElementById('itemPrice');
    if (itemPrice) {
        itemPrice.addEventListener('input', (e) => {
            const country = document.getElementById('quoteCountrySelect')?.value || '';
            autoPopulateSalesTax(country, e.target.value);
        });
    } else {
        console.error('itemPrice element not found in DOM');
    }

    ['grossWeight', 'length', 'width', 'height'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', updateWeights);
        } else {
            console.error(`${id} element not found in DOM`);
        }
    });

    const quoteForm = document.getElementById('quoteForm');
    if (quoteForm) {
        quoteForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!validateQuoteForm()) return;
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            const sourceSettings = getCountrySettings()[data.country] || {};
            const userBaseCurrency = 'NPR';
            const effectiveWeight = updateWeights();
            const customsCategory = data.customsCategory;
            const customsPercent = getCustomsCategories()[customsCategory] || 0;

            console.log('Form data submitted:', data);
            console.log('Source settings:', sourceSettings);

            const itemPrice = parseFloat(data.itemPrice) || 0;
            const salesTaxPrice = data.salesTaxPrice ? parseFloat(data.salesTaxPrice) || 0 : 0;

            console.log('Calculated values:', { itemPrice, salesTaxPrice, effectiveWeight, customsPercent });

            const quote = calculateShippingQuotes(
                effectiveWeight, itemPrice, salesTaxPrice,
                parseFloat(data.merchantShippingPrice) || 0, customsPercent,
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
                    <p>Effective Weight Used: ${effectiveWeight.toFixed(2)} ${sourceSettings.weightUnit || 'lbs'}</p>
                    <p>Customs Duty: ${customsPercent}% (Category: ${customsCategory.charAt(0).toUpperCase() + customsCategory.slice(1)})</p>
                    <table border="1" style="border-collapse: collapse; width: 100%; margin-top: 20px;">
                        <thead>
                            <tr>
                                <th style="padding: 10px;">Item</th>
                                <th style="padding: 10px;">${sourceSettings.currency || 'USD'} (Sourcing)</th>
                                <th style="padding: 10px;">NPR (User)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding: 10px;">Product Price</td>
                                <td>${sourceSymbol}${(quote.itemPrice.toFixed(2))}</td>
                                <td>${userSymbol}${(userQuote.itemPrice.toFixed(2))}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;">Sales Tax</td>
                                <td>${sourceSymbol}${(quote.salesTaxPrice.toFixed(2))}</td>
                                <td>${userSymbol}${(userQuote.salesTaxPrice.toFixed(2))}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;">Merchant Shipping</td>
                                <td>${sourceSymbol}${(quote.merchantShippingPrice.toFixed(2))}</td>
                                <td>${userSymbol}${(userQuote.merchantShippingPrice.toFixed(2))}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;">International Shipping</td>
                                <td>${sourceSymbol}${(quote.interNationalShipping.toFixed(2))}</td>
                                <td>${userSymbol}${(userQuote.interNationalShipping.toFixed(2))}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;">Customs Duty</td>
                                <td>${sourceSymbol}${(quote.customsAndECS.toFixed(2))}</td>
                                <td>${userSymbol}${(userQuote.customsAndECS.toFixed(2))}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;">Domestic Shipping</td>
                                <td>${sourceSymbol}${(quote.domesticShipping.toFixed(2))}</td>
                                <td>${userSymbol}${(userQuote.domesticShipping.toFixed(2))}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;">Handling Charge</td>
                                <td>${sourceSymbol}${(quote.handlingCharge.toFixed(2))}</td>
                                <td>${userSymbol}${(userQuote.handlingCharge.toFixed(2))}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;">Payment Gateway Fee</td>
                                <td>${sourceSymbol}${(quote.paymentGatewayFee.toFixed(2))}</td>
                                <td>${userSymbol}${(userQuote.paymentGatewayFee.toFixed(2))}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;">Discount</td>
                                <td>${sourceSymbol}${(quote.discount.toFixed(2))}</td>
                                <td>${userSymbol}${(userQuote.discount.toFixed(2))}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;">Insurance Amount</td>
                                <td>${sourceSymbol}${(quote.insuranceAmount.toFixed(2))}</td>
                                <td>${userSymbol}${(userQuote.insuranceAmount.toFixed(2))}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;">VAT (${sourceSettings.vat || 0}%)</td>
                                <td>${sourceSymbol}${(quote.vat.toFixed(2))}</td>
                                <td>${userSymbol}${(userQuote.vat.toFixed(2))}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;">Subtotal</td>
                                <td>${sourceSymbol}${(quote.subTotal.toFixed(2))}</td>
                                <td>${userSymbol}${(userQuote.subTotal.toFixed(2))}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;">Final Total</td>
                                <td>${sourceSymbol}${(quote.finalTotal.toFixed(2))}</td>
                                <td>${userSymbol}${(userQuote.finalTotal.toFixed(2))}</td>
                            </tr>
                        </tbody>
                    </table>
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

// Expose functions to global scope
window.saveCurrentQuote = saveCurrentQuote;
window.showSavedQuotes = showSavedQuotes;
window.loadQuote = loadQuote;
window.deleteQuote = deleteQuote;
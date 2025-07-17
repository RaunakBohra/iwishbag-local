/**
 * Script to fix country codes in database
 *
 * This script finds and fixes records where country codes are stored as full names
 * instead of 2-character ISO codes. It's especially useful for fixing "Nepal" -> "NP"
 *
 * Usage: node scripts/fix-country-codes.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Country name to code mapping
const COUNTRY_NAME_TO_CODE = {
  Nepal: 'NP',
  India: 'IN',
  'United States': 'US',
  USA: 'US',
  China: 'CN',
  Australia: 'AU',
  'United Kingdom': 'GB',
  Canada: 'CA',
  Germany: 'DE',
  France: 'FR',
  Japan: 'JP',
  'South Korea': 'KR',
  Thailand: 'TH',
  Malaysia: 'MY',
  Singapore: 'SG',
  Philippines: 'PH',
  Indonesia: 'ID',
  Vietnam: 'VN',
  Bangladesh: 'BD',
  'Sri Lanka': 'LK',
  Pakistan: 'PK',
};

async function main() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase URL or Service Role Key');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('Starting country code normalization...');

  // Fix quotes table - destination_country and origin_country
  console.log('\nChecking quotes table...');
  const { data: quotes, error: quotesError } = await supabase
    .from('quotes')
    .select('id, destination_country, origin_country, shipping_address')
    .neq('destination_country', null);

  if (quotesError) {
    console.error('Error fetching quotes:', quotesError);
    return;
  }

  console.log(`Found ${quotes.length} quotes to check`);

  let quotesUpdated = 0;
  for (const quote of quotes) {
    const updates = {};

    // Check destination_country
    if (quote.destination_country && COUNTRY_NAME_TO_CODE[quote.destination_country]) {
      updates.destination_country = COUNTRY_NAME_TO_CODE[quote.destination_country];
      console.log(
        `Quote ${quote.id}: ${quote.destination_country} -> ${updates.destination_country}`,
      );
    }

    // Check origin_country
    if (quote.origin_country && COUNTRY_NAME_TO_CODE[quote.origin_country]) {
      updates.origin_country = COUNTRY_NAME_TO_CODE[quote.origin_country];
      console.log(`Quote ${quote.id}: ${quote.origin_country} -> ${updates.origin_country}`);
    }

    // Check shipping_address JSON
    if (quote.shipping_address) {
      try {
        const shippingAddr =
          typeof quote.shipping_address === 'string'
            ? JSON.parse(quote.shipping_address)
            : quote.shipping_address;

        let addressUpdated = false;

        if (
          shippingAddr.destination_country &&
          COUNTRY_NAME_TO_CODE[shippingAddr.destination_country]
        ) {
          shippingAddr.destination_country = COUNTRY_NAME_TO_CODE[shippingAddr.destination_country];
          addressUpdated = true;
        }

        if (shippingAddr.country && COUNTRY_NAME_TO_CODE[shippingAddr.country]) {
          shippingAddr.country = COUNTRY_NAME_TO_CODE[shippingAddr.country];
          addressUpdated = true;
        }

        if (addressUpdated) {
          updates.shipping_address = shippingAddr;
          console.log(`Quote ${quote.id}: Updated shipping address countries`);
        }
      } catch (e) {
        console.warn(`Quote ${quote.id}: Could not parse shipping address`);
      }
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('quotes')
        .update(updates)
        .eq('id', quote.id);

      if (updateError) {
        console.error(`Error updating quote ${quote.id}:`, updateError);
      } else {
        quotesUpdated++;
      }
    }
  }

  console.log(`Updated ${quotesUpdated} quotes`);

  // Fix user_addresses table
  console.log('\nChecking user_addresses table...');
  const { data: addresses, error: addressesError } = await supabase
    .from('user_addresses')
    .select('id, country, destination_country')
    .neq('country', null);

  if (addressesError) {
    console.error('Error fetching user addresses:', addressesError);
    return;
  }

  console.log(`Found ${addresses.length} addresses to check`);

  let addressesUpdated = 0;
  for (const address of addresses) {
    const updates = {};

    if (address.country && COUNTRY_NAME_TO_CODE[address.country]) {
      updates.country = COUNTRY_NAME_TO_CODE[address.country];
      console.log(`Address ${address.id}: ${address.country} -> ${updates.country}`);
    }

    if (address.destination_country && COUNTRY_NAME_TO_CODE[address.destination_country]) {
      updates.destination_country = COUNTRY_NAME_TO_CODE[address.destination_country];
      console.log(
        `Address ${address.id}: ${address.destination_country} -> ${updates.destination_country}`,
      );
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('user_addresses')
        .update(updates)
        .eq('id', address.id);

      if (updateError) {
        console.error(`Error updating address ${address.id}:`, updateError);
      } else {
        addressesUpdated++;
      }
    }
  }

  console.log(`Updated ${addressesUpdated} addresses`);

  // Fix profiles table
  console.log('\nChecking profiles table...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, country')
    .neq('country', null);

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
    return;
  }

  console.log(`Found ${profiles.length} profiles to check`);

  let profilesUpdated = 0;
  for (const profile of profiles) {
    if (profile.country && COUNTRY_NAME_TO_CODE[profile.country]) {
      const newCountry = COUNTRY_NAME_TO_CODE[profile.country];
      console.log(`Profile ${profile.id}: ${profile.country} -> ${newCountry}`);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ country: newCountry })
        .eq('id', profile.id);

      if (updateError) {
        console.error(`Error updating profile ${profile.id}:`, updateError);
      } else {
        profilesUpdated++;
      }
    }
  }

  console.log(`Updated ${profilesUpdated} profiles`);

  console.log('\nCountry code normalization completed!');
  console.log(`Summary:`);
  console.log(`- Quotes updated: ${quotesUpdated}`);
  console.log(`- Addresses updated: ${addressesUpdated}`);
  console.log(`- Profiles updated: ${profilesUpdated}`);
}

main().catch(console.error);

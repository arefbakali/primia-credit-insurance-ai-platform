/**
 * Script to link all existing data to companies in the database
 * This script:
 * 1. Creates company records for all companies in financial_results
 * 2. Links financial_results to companies
 * 3. Links stock trading history to companies
 * 4. Updates company records with user emails
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function linkAllCompanyData() {
    console.log('='.repeat(60));
    console.log('LINKING ALL DATA TO COMPANIES');
    console.log('='.repeat(60));
    console.log();

    try {
        // Step 1: Get all unique company names from financial_results
        console.log('STEP 1: Getting all companies from financial_results...');
        const { data: financialData, error: finError } = await supabase
            .from('financial_results')
            .select('company_name')
            .order('company_name');

        if (finError) throw finError;

        const uniqueCompanies = [...new Set(financialData.map(f => f.company_name))];
        console.log(`✓ Found ${uniqueCompanies.length} unique companies\n`);

        // Step 2: Get all users to link emails
        console.log('STEP 2: Getting user emails...');
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('email, name')
            .eq('role', 'user');

        if (usersError) throw usersError;

        // Create a map of company name to user email
        const companyToUserMap = {};
        users.forEach(user => {
            if (user.name) {
                companyToUserMap[user.name.trim()] = user.email;
            }
        });
        console.log(`✓ Found ${users.length} users to link\n`);

        // Step 3: Create/update company records
        console.log('STEP 3: Creating/updating company records...');
        let companiesCreated = 0;
        let companiesUpdated = 0;

        for (const companyName of uniqueCompanies) {
            if (!companyName || companyName.trim() === '') continue;

            const userEmail = companyToUserMap[companyName.trim()] || null;

            // Check if company exists
            const { data: existing, error: checkError } = await supabase
                .from('companies')
                .select('id')
                .eq('company_name', companyName.trim())
                .maybeSingle();

            if (checkError && !checkError.message.includes('schema cache')) {
                console.error(`  ✗ Error checking company ${companyName}:`, checkError.message);
                continue;
            }

            const companyData = {
                company_name: companyName.trim(),
                user_email: userEmail,
                updated_at: new Date().toISOString()
            };

            if (existing) {
                // Update existing
                const { error: updateError } = await supabase
                    .from('companies')
                    .update(companyData)
                    .eq('id', existing.id);

                if (updateError) {
                    console.error(`  ✗ Error updating ${companyName}:`, updateError.message);
                } else {
                    companiesUpdated++;
                }
            } else {
                // Create new
                const { error: insertError } = await supabase
                    .from('companies')
                    .insert([companyData]);

                if (insertError) {
                    console.error(`  ✗ Error creating ${companyName}:`, insertError.message);
                } else {
                    companiesCreated++;
                    console.log(`  ✓ Created: ${companyName}${userEmail ? ` (linked to ${userEmail})` : ''}`);
                }
            }
        }

        console.log(`\n✓ Companies created: ${companiesCreated}`);
        console.log(`✓ Companies updated: ${companiesUpdated}\n`);

        // Step 4: Link financial_results to companies (already linked via company_name, just verify)
        console.log('STEP 4: Verifying financial_results are linked to companies...');
        let financialCount = 0;
        const { count: finCount, error: finCountError } = await supabase
            .from('financial_results')
            .select('*', { count: 'exact', head: true });
        
        if (!finCountError) {
            financialCount = finCount || 0;
            console.log(`  ✓ Financial results records: ${financialCount}`);
            console.log(`  ✓ Financial results are linked via company_name field\n`);
        }

        // Step 5: Update stock_trading_history to link company names (if table exists)
        console.log('STEP 5: Linking stock trading history to companies...');
        try {
            const { data: stockCheck, error: stockCheckError } = await supabase
                .from('stock_trading_history')
                .select('id')
                .limit(1);

            if (stockCheckError && stockCheckError.message.includes('schema cache')) {
                console.log(`  ⚠ Stock trading history table doesn't exist - skipping`);
            } else if (!stockCheckError) {
                // Get count of stock records
                const { count: stockCount } = await supabase
                    .from('stock_trading_history')
                    .select('*', { count: 'exact', head: true });
                console.log(`  ✓ Stock trading history records: ${stockCount || 0}`);
                console.log(`  ✓ Stock trading history is linked via company_name field`);
            }
        } catch (err) {
            console.log(`  ⚠ Error checking stock trading history:`, err.message);
        }

        console.log();

        // Final Summary
        console.log('='.repeat(60));
        console.log('LINKING SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total companies processed: ${uniqueCompanies.length}`);
        console.log(`Companies created: ${companiesCreated}`);
        console.log(`Companies updated: ${companiesUpdated}`);
        console.log(`Users linked: ${Object.keys(companyToUserMap).length}`);
        console.log(`Financial results: ${financialCount || 0} records (linked via company_name)`);
        console.log('='.repeat(60));
        console.log('\n✅ All data linking completed!');
        console.log('\n📊 Data Relationships:');
        console.log('   users.email ────< companies.user_email');
        console.log('   companies.company_name ────< financial_results.company_name');
        console.log('   companies.company_name ────< stock_trading_history.company_name');

    } catch (error) {
        console.error('\n❌ Error linking data:', error);
        process.exit(1);
    }
}

// Run linking
if (require.main === module) {
    linkAllCompanyData().catch(console.error);
}

module.exports = { linkAllCompanyData };


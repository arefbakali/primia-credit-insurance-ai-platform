require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to normalize company name for email
function normalizeCompanyName(name) {
    if (!name) return 'unknown';
    
    let normalized = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, '.') // Replace spaces with dots
        .replace(/\.+/g, '.') // Replace multiple dots with single dot
        .replace(/^\.|\.$/g, ''); // Remove leading/trailing dots
    
    return normalized || 'unknown';
}

// Generate a random password
function generatePassword(length = 12) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}

// Read and parse CSV file
function readCSV(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        if (!fs.existsSync(filePath)) {
            reject(new Error(`File not found: ${filePath}`));
            return;
        }
        fs.createReadStream(filePath, { encoding: 'utf8' })
            .pipe(csv())
            .on('data', (data) => {
                // Remove BOM from keys if present
                const cleanData = {};
                for (const key in data) {
                    const cleanKey = key.replace(/^\ufeff/, ''); // Remove BOM
                    cleanData[cleanKey] = data[key];
                }
                results.push(cleanData);
            })
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
    });
}

// Create or get user for company
async function createCompanyUser(companyName) {
    const normalizedName = normalizeCompanyName(companyName);
    const email = `${normalizedName}@makina.tn`;
    const password = generatePassword();
    
    try {
        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('email, id')
            .eq('email', email)
            .maybeSingle();
        
        if (existingUser) {
            console.log(`  ✓ User exists: ${email}`);
            return { email, password: null, existing: true, userId: existingUser.id };
        }
        
        // Create new user with role 'user'
        const { data, error } = await supabase
            .from('users')
            .insert([{
                email,
                password,
                name: companyName,
                role: 'user'
            }])
            .select();
        
        if (error) {
            if (error.code === '23505') {
                console.log(`  ✓ User already exists (constraint): ${email}`);
                return { email, password: null, existing: true };
            }
            throw error;
        }
        
        console.log(`  ✓ Created user: ${email} (Password: ${password})`);
        return { email, password, existing: false, user: data[0], userId: data[0].id };
    } catch (error) {
        console.error(`  ✗ Error creating user for ${companyName}:`, error.message);
        return { email, password: null, error: error.message };
    }
}

// Create or update company record (optional - only if companies table exists)
async function upsertCompany(companyName, userEmail) {
    try {
        const { data: existing, error: checkError } = await supabase
            .from('companies')
            .select('id')
            .eq('company_name', companyName)
            .maybeSingle();
        
        // If table doesn't exist, skip silently
        if (checkError && (checkError.code === '42P01' || checkError.message.includes('schema cache'))) {
            return; // Companies table doesn't exist, skip
        }
        
        const companyData = {
            company_name: companyName,
            user_email: userEmail,
            updated_at: new Date().toISOString()
        };
        
        if (existing) {
            const { error } = await supabase
                .from('companies')
                .update(companyData)
                .eq('id', existing.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('companies')
                .insert([companyData]);
            if (error) throw error;
            console.log(`  ✓ Created company record: ${companyName}`);
        }
    } catch (error) {
        // Silently fail if companies table doesn't exist
        if (error.code !== '42P01' && !error.message.includes('schema cache')) {
            console.error(`  ✗ Error upserting company ${companyName}:`, error.message);
        }
    }
}

// Insert or update financial data
async function upsertFinancialData(companyName, financialData) {
    try {
        const { data: existing } = await supabase
            .from('financial_results')
            .select('id')
            .eq('company_name', companyName)
            .maybeSingle();
        
        const dataToInsert = {
            company_name: companyName,
            net_result: financialData.net_result || null,
            revenue: financialData.revenue || null,
            margin: financialData.margin || null,
            status: financialData.status || 'loss',
            processed_at: financialData.processed_at || new Date().toISOString()
        };
        
        if (existing) {
            const { error } = await supabase
                .from('financial_results')
                .update(dataToInsert)
                .eq('id', existing.id);
            if (error) throw error;
            console.log(`  ✓ Updated financial data for: ${companyName}`);
        } else {
            const { error } = await supabase
                .from('financial_results')
                .insert([dataToInsert]);
            if (error) throw error;
            console.log(`  ✓ Inserted financial data for: ${companyName}`);
        }
    } catch (error) {
        console.error(`  ✗ Error upserting financial data for ${companyName}:`, error.message);
    }
}

// Import stock trading history
async function importStockTradingHistory(filePath, year) {
    try {
        // Check if table exists first
        const { error: checkError } = await supabase
            .from('stock_trading_history')
            .select('id')
            .limit(1);
        
        if (checkError && (checkError.code === '42P01' || checkError.message.includes('schema cache'))) {
            console.log(`  ⚠ Skipping stock trading history import - table 'stock_trading_history' does not exist`);
            console.log(`  💡 Create the table using createTables.sql if you want to import this data\n`);
            return;
        }
        
        console.log(`\nImporting stock trading history from ${path.basename(filePath)} (Year: ${year})...`);
        const records = await readCSV(filePath);
        
        // Map company codes/names from valeur column to company names
        // This is a simplified mapping - you may need to adjust based on actual data
        const batchSize = 100;
        let inserted = 0;
        
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            const stockData = batch.map(record => {
                // Parse date (format: DD/MM/YYYY)
                const dateParts = record.SEANCE?.trim().split('/');
                let seance = null;
                if (dateParts && dateParts.length === 3) {
                    seance = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
                }
                
                return {
                    seance: seance || new Date().toISOString().split('T')[0],
                    groupe: record.GROUPE?.trim() || null,
                    code: record.CODE?.trim() || null,
                    valeur: record.VALEUR?.trim() || null,
                    ouverture: record.OUVERTURE ? parseFloat(record.OUVERTURE) : null,
                    cloture: record.CLOTURE ? parseFloat(record.CLOTURE) : null,
                    plus_bas: record.PLUS_BAS ? parseFloat(record.PLUS_BAS) : null,
                    plus_haut: record.PLUS_HAUT ? parseFloat(record.PLUS_HAUT) : null,
                    quantite_negociee: record.QUANTITE_NEGOCIEE ? parseInt(record.QUANTITE_NEGOCIEE) : null,
                    nb_transaction: record.NB_TRANSACTION ? parseInt(record.NB_TRANSACTION) : null,
                    capitaux: record.CAPITAUX ? parseFloat(record.CAPITAUX) : null,
                    company_name: record.VALEUR?.trim() || null, // Using valeur as company identifier
                    year: year
                };
            }).filter(r => r.seance); // Filter out records without valid dates
            
            if (stockData.length > 0) {
                const { error } = await supabase
                    .from('stock_trading_history')
                    .insert(stockData);
                
                if (error) {
                    // Stop if table doesn't exist (already checked at start, but double-check)
                    if (error.message.includes('schema cache') || error.code === '42P01') {
                        break;
                    }
                    // Log first few errors only
                    if (inserted === 0) {
                        console.error(`  ✗ Error inserting batch:`, error.message);
                    }
                } else {
                    inserted += stockData.length;
                }
            }
        }
        
        console.log(`  ✓ Inserted ${inserted} stock trading records for year ${year}`);
    } catch (error) {
        console.error(`  ✗ Error importing stock trading history:`, error.message);
    }
}

// Check if companies table exists (optional check)
async function checkTables() {
    try {
        // Try to query companies table
        const { error } = await supabase
            .from('companies')
            .select('id')
            .limit(1);
        
        if (error && error.code === '42P01') {
            console.log('⚠️  WARNING: Companies table does not exist!');
            console.log('   Please create the tables first using the SQL script in createTables.sql');
            console.log('   Or run the SQL in Supabase Dashboard > SQL Editor\n');
        }
    } catch (err) {
        // Ignore errors
    }
}

// Main import function
async function importAllData() {
    const dataDir = path.join(__dirname, '../../ia_model/data');
    const csvFile = path.join(dataDir, 'financial_analysis_results.csv');
    
    console.log('='.repeat(60));
    console.log('MAKINA DATA IMPORT - COMPLETE DATABASE SETUP');
    console.log('='.repeat(60));
    console.log(`Reading from: ${csvFile}\n`);
    
    // Check if tables exist
    await checkTables();
    
    if (!fs.existsSync(csvFile)) {
        console.error(`File not found: ${csvFile}`);
        process.exit(1);
    }
    
    try {
        const companies = await readCSV(csvFile);
        console.log(`Found ${companies.length} companies to import\n`);
        
        const credentials = [];
        let successCount = 0;
        let errorCount = 0;
        
        // Step 1: Create users and companies
        console.log('STEP 1: Creating users and company records...');
        console.log('(Note: Companies table is optional - errors about missing table are expected if not created)\n');
        for (const company of companies) {
            // Get company name (handle BOM if present)
            const companyName = (company.company_name || '').toString().trim();
            if (!companyName || companyName === 'company_name' || companyName === '') {
                continue;
            }
            
            console.log(`Processing: ${companyName}`);
            
            // Create user
            const userResult = await createCompanyUser(companyName);
            
            if (userResult.error) {
                errorCount++;
                continue;
            }
            
            // Store credentials if new user
            if (!userResult.existing && userResult.password) {
                credentials.push({
                    company: companyName,
                    email: userResult.email,
                    password: userResult.password
                });
            }
            
            // Create company record (linked to user)
            await upsertCompany(companyName, userResult.email);
            
            successCount++;
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Step 2: Import financial data
        console.log('\n\nSTEP 2: Importing financial data...\n');
        for (const company of companies) {
            const companyName = (company.company_name || '').toString().trim();
            if (!companyName || companyName === 'company_name' || companyName === '') continue;
            
            const financialData = {
                net_result: (company.net_result || '').toString().trim() !== '' 
                    ? parseFloat(company.net_result) : null,
                revenue: (company.revenue || '').toString().trim() !== '' 
                    ? parseFloat(company.revenue) : null,
                margin: (company.margin || '').toString().trim() !== '' 
                    ? parseFloat(company.margin) : null,
                status: ((company.status || '').toString().trim() !== '') 
                    ? company.status.toString().toLowerCase() : 'loss',
                processed_at: company.processed_at || new Date().toISOString()
            };
            
            await upsertFinancialData(companyName, financialData);
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Step 3: Import stock trading history (optional)
        console.log('\n\nSTEP 3: Importing stock trading history (optional)...\n');
        const stockFiles = [
            { file: path.join(dataDir, 'histo_cotation_2022.csv'), year: 2022 },
            { file: path.join(dataDir, 'histo_cotation_2023.csv'), year: 2023 },
            { file: path.join(dataDir, 'histo_cotation_2024.csv'), year: 2024 }
        ];
        
        for (const stockFile of stockFiles) {
            if (fs.existsSync(stockFile.file)) {
                await importStockTradingHistory(stockFile.file, stockFile.year);
            } else {
                console.log(`  ⚠ File not found: ${stockFile.file} - skipping`);
            }
        }
        
        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('IMPORT SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total companies processed: ${companies.length}`);
        console.log(`Successfully imported: ${successCount}`);
        console.log(`Errors: ${errorCount}`);
        console.log(`New users created: ${credentials.length}`);
        console.log('='.repeat(60));
        
        // Save credentials
        if (credentials.length > 0) {
            const credentialsFile = path.join(__dirname, '../../company_credentials.json');
            fs.writeFileSync(credentialsFile, JSON.stringify(credentials, null, 2));
            console.log(`\n✓ Credentials saved to: ${credentialsFile}`);
            console.log('⚠️  IMPORTANT: Keep this file secure!');
            console.log('   Share passwords with companies securely!');
        }
        
        console.log('\n✅ Import completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Import error:', error);
        process.exit(1);
    }
}

// Run import
if (require.main === module) {
    importAllData().catch(console.error);
}

module.exports = { importAllData };


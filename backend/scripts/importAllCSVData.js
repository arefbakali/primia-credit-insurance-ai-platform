/**
 * Comprehensive script to import ALL CSV data into the database
 * Handles:
 * 1. financial_analysis_results.csv - Financial data
 * 2. histo_cotation_*.csv - Stock trading history (semicolon delimited)
 * 3. histo_indice_*.csv - Stock index history (semicolon delimited)
 * 4. cmf.csv - Company links/URLs
 * 5. Creates users for each company
 * 6. Links all data to companies
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');

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

// Read CSV file with custom delimiter
function readCSV(filePath, delimiter = ',') {
    return new Promise((resolve, reject) => {
        const results = [];
        if (!fs.existsSync(filePath)) {
            reject(new Error(`File not found: ${filePath}`));
            return;
        }
        fs.createReadStream(filePath, { encoding: 'utf8' })
            .pipe(csv({ separator: delimiter }))
            .on('data', (data) => {
                // Remove BOM from keys if present
                const cleanData = {};
                for (const key in data) {
                    const cleanKey = key.replace(/^\ufeff/, '').trim();
                    cleanData[cleanKey] = data[key]?.trim() || '';
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
        const { data: existingUser } = await supabase
            .from('users')
            .select('email, id')
            .eq('email', email)
            .maybeSingle();
        
        if (existingUser) {
            return { email, password: null, existing: true, userId: existingUser.id };
        }
        
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
                return { email, password: null, existing: true };
            }
            throw error;
        }
        
        console.log(`  ✓ Created user: ${email}`);
        return { email, password, existing: false, user: data[0], userId: data[0].id };
    } catch (error) {
        console.error(`  ✗ Error creating user for ${companyName}:`, error.message);
        return { email, password: null, error: error.message };
    }
}

// Create or update company record
async function upsertCompany(companyName, userEmail, cmfLink = null) {
    try {
        const { data: existing } = await supabase
            .from('companies')
            .select('id')
            .eq('company_name', companyName.trim())
            .maybeSingle();
        
        if (existing?.error && existing.error.message.includes('schema cache')) {
            return { created: false, skipped: true };
        }
        
        const companyData = {
            company_name: companyName.trim(),
            user_email: userEmail,
            description: cmfLink || null,
            updated_at: new Date().toISOString()
        };
        
        if (existing) {
            const { error } = await supabase
                .from('companies')
                .update(companyData)
                .eq('id', existing.id);
            if (error) throw error;
            return { created: false, updated: true };
        } else {
            const { error } = await supabase
                .from('companies')
                .insert([companyData]);
            if (error) throw error;
            return { created: true, updated: false };
        }
    } catch (error) {
        if (!error.message.includes('schema cache')) {
            console.error(`  ✗ Error upserting company ${companyName}:`, error.message);
        }
        return { created: false, error: error.message };
    }
}

// Import financial data
async function importFinancialData(dataDir) {
    console.log('\n📊 STEP 2: Importing financial data...\n');
    const csvFile = path.join(dataDir, 'financial_analysis_results.csv');
    
    if (!fs.existsSync(csvFile)) {
        console.log('  ⚠ financial_analysis_results.csv not found - skipping');
        return [];
    }
    
    const companies = await readCSV(csvFile);
    let imported = 0;
    
    for (const company of companies) {
        const companyName = (company.company_name || '').toString().trim();
        if (!companyName || companyName === 'company_name') continue;
        
        try {
            const financialData = {
                company_name: companyName,
                net_result: company.net_result?.trim() ? parseFloat(company.net_result) : null,
                revenue: company.revenue?.trim() ? parseFloat(company.revenue) : null,
                margin: company.margin?.trim() ? parseFloat(company.margin) : null,
                status: company.status?.trim().toLowerCase() || 'loss',
                processed_at: company.processed_at || new Date().toISOString()
            };
            
            const { data: existing } = await supabase
                .from('financial_results')
                .select('id')
                .eq('company_name', companyName)
                .maybeSingle();
            
            if (existing) {
                await supabase
                    .from('financial_results')
                    .update(financialData)
                    .eq('id', existing.id);
            } else {
                await supabase
                    .from('financial_results')
                    .insert([financialData]);
                imported++;
            }
        } catch (error) {
            console.error(`  ✗ Error importing financial data for ${companyName}:`, error.message);
        }
    }
    
    console.log(`  ✓ Imported/updated ${imported} financial records`);
    return companies.map(c => (c.company_name || '').toString().trim()).filter(Boolean);
}

// Import CMF links
async function importCMFLinks(dataDir, companyNames) {
    console.log('\n🔗 STEP 3: Importing CMF company links...\n');
    const cmfFile = path.join(dataDir, 'cmf.csv');
    
    if (!fs.existsSync(cmfFile)) {
        console.log('  ⚠ cmf.csv not found - skipping');
        return {};
    }
    
    const records = await readCSV(cmfFile);
    const cmfMap = {};
    let linked = 0;
    
    // Create a normalized map of company names for matching
    const normalizedCompanyMap = {};
    companyNames.forEach(name => {
        const normalized = name.toLowerCase().trim();
        normalizedCompanyMap[normalized] = name;
    });
    
    for (const record of records) {
        const companyName = (record.Entreprise || record.entreprise || '').toString().trim();
        const link = (record.Lien_3T2025 || record.lien_3t2025 || '').toString().trim();
        
        if (companyName && link) {
            cmfMap[companyName] = link;
            
            // Try to match with existing company (exact or normalized)
            let matchedCompanyName = companyName;
            const normalized = companyName.toLowerCase().trim();
            if (normalizedCompanyMap[normalized]) {
                matchedCompanyName = normalizedCompanyMap[normalized];
            }
            
            // Update company description with CMF link
            try {
                const { error } = await supabase
                    .from('companies')
                    .update({ description: link })
                    .eq('company_name', matchedCompanyName);
                
                if (!error) linked++;
            } catch (err) {
                // Silently fail if table doesn't exist
            }
        }
    }
    
    console.log(`  ✓ Processed ${records.length} CMF links (${linked} updated)`);
    return cmfMap;
}

// Import stock trading history (semicolon delimited)
async function importStockTradingHistory(dataDir) {
    console.log('\n📈 STEP 4: Importing stock trading history...\n');
    
    const files = [
        { file: path.join(dataDir, 'histo_cotation_2022.csv'), year: 2022 },
        { file: path.join(dataDir, 'histo_cotation_2023.csv'), year: 2023 },
        { file: path.join(dataDir, 'histo_cotation_2024.csv'), year: 2024 }
    ];
    
    let totalInserted = 0;
    
    for (const fileInfo of files) {
        if (!fs.existsSync(fileInfo.file)) {
            console.log(`  ⚠ ${path.basename(fileInfo.file)} not found - skipping`);
            continue;
        }
        
        try {
            // Check if table exists
            const { error: checkError } = await supabase
                .from('stock_trading_history')
                .select('id')
                .limit(1);
            
            if (checkError && checkError.message.includes('schema cache')) {
                console.log(`  ⚠ Stock trading history table doesn't exist - skipping all stock files`);
                break;
            }
            
            console.log(`  Processing ${path.basename(fileInfo.file)}...`);
            const records = await readCSV(fileInfo.file, ';');
            
            const batchSize = 500;
            let inserted = 0;
            let skipped = 0;
            
            for (let i = 0; i < records.length; i += batchSize) {
                const batch = records.slice(i, i + batchSize);
                const stockData = batch
                    .map(record => {
                        const seanceStr = (record.SEANCE || record.seance || '').trim();
                        if (!seanceStr) return null;
                        
                        // Parse date (DD/MM/YYYY)
                        const dateParts = seanceStr.split('/');
                        let seance = null;
                        if (dateParts.length === 3) {
                            seance = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
                        }
                        
                        const valeur = (record.VALEUR || record.valeur || '').trim();
                        
                        return {
                            seance: seance || new Date().toISOString().split('T')[0],
                            groupe: (record.GROUPE || record.groupe || '').trim() || null,
                            code: (record.CODE || record.code || '').trim() || null,
                            valeur: valeur || null,
                            ouverture: record.OUVERTURE ? parseFloat(record.OUVERTURE) : null,
                            cloture: record.CLOTURE ? parseFloat(record.CLOTURE) : null,
                            plus_bas: record.PLUS_BAS ? parseFloat(record.PLUS_BAS) : null,
                            plus_haut: record.PLUS_HAUT ? parseFloat(record.PLUS_HAUT) : null,
                            quantite_negociee: record.QUANTITE_NEGOCIEE ? parseInt(record.QUANTITE_NEGOCIEE) : null,
                            nb_transaction: record.NB_TRANSACTION ? parseInt(record.NB_TRANSACTION) : null,
                            capitaux: record.CAPITAUX ? parseFloat(record.CAPITAUX) : null,
                            company_name: valeur || null, // Use valeur as company identifier
                            year: fileInfo.year
                        };
                    })
                    .filter(r => r && r.seance);
                
                if (stockData.length > 0) {
                    const { error } = await supabase
                        .from('stock_trading_history')
                        .insert(stockData);
                    
                    if (error) {
                        if (error.message.includes('schema cache')) break;
                        skipped += stockData.length;
                    } else {
                        inserted += stockData.length;
                    }
                }
                
                // Progress indicator
                if ((i + batchSize) % 5000 === 0) {
                    process.stdout.write(`    Processed ${Math.min(i + batchSize, records.length)}/${records.length} records...\r`);
                }
            }
            
            console.log(`  ✓ ${fileInfo.year}: Inserted ${inserted}, Skipped ${skipped}`);
            totalInserted += inserted;
            
        } catch (error) {
            console.error(`  ✗ Error processing ${fileInfo.file}:`, error.message);
        }
    }
    
    console.log(`  ✓ Total stock trading records imported: ${totalInserted}`);
}

// Import stock index history (semicolon delimited)
async function importStockIndexHistory(dataDir) {
    console.log('\n📊 STEP 5: Importing stock index history...\n');
    
    const files = [
        { file: path.join(dataDir, 'histo_indice_2022.csv'), year: 2022 },
        { file: path.join(dataDir, 'histo_indice_2023.csv'), year: 2023 },
        { file: path.join(dataDir, 'histo_indice_2024.csv'), year: 2024 }
    ];
    
    let totalInserted = 0;
    
    for (const fileInfo of files) {
        if (!fs.existsSync(fileInfo.file)) {
            console.log(`  ⚠ ${path.basename(fileInfo.file)} not found - skipping`);
            continue;
        }
        
        try {
            // Check if table exists
            const { error: checkError } = await supabase
                .from('stock_index_history')
                .select('id')
                .limit(1);
            
            if (checkError && checkError.message.includes('schema cache')) {
                console.log(`  ⚠ Stock index history table doesn't exist - skipping all index files`);
                break;
            }
            
            console.log(`  Processing ${path.basename(fileInfo.file)}...`);
            const records = await readCSV(fileInfo.file, ';');
            
            const batchSize = 500;
            let inserted = 0;
            let skipped = 0;
            
            for (let i = 0; i < records.length; i += batchSize) {
                const batch = records.slice(i, i + batchSize);
                const indexData = batch
                    .map(record => {
                        const seanceStr = (record.SEANCE || record.seance || '').trim();
                        if (!seanceStr) return null;
                        
                        // Parse date (DD/MM/YYYY)
                        const dateParts = seanceStr.split('/');
                        let seance = null;
                        if (dateParts.length === 3) {
                            seance = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
                        }
                        
                        return {
                            seance: seance || new Date().toISOString().split('T')[0],
                            code_indice: (record.CODE_INDICE || record.code_indice || '').trim() || null,
                            lib_indice: (record.LIB_INDICE || record.lib_indice || '').trim() || null,
                            indice_jour: record.INDICE_JOUR ? parseFloat(record.INDICE_JOUR) : null,
                            indice_veille: record.INDICE_VEILLE ? parseFloat(record.INDICE_VEILLE) : null,
                            variation_veille: record.VARIATION_VEILLE ? parseFloat(record.VARIATION_VEILLE) : null,
                            indice_plus_haut: record.INDICE_PLUS_HAUT ? parseFloat(record.INDICE_PLUS_HAUT) : null,
                            indice_plus_bas: record.INDICE_PLUS_BAS ? parseFloat(record.INDICE_PLUS_BAS) : null,
                            year: fileInfo.year
                        };
                    })
                    .filter(r => r && r.seance);
                
                if (indexData.length > 0) {
                    const { error } = await supabase
                        .from('stock_index_history')
                        .insert(indexData);
                    
                    if (error) {
                        if (error.message.includes('schema cache')) break;
                        skipped += indexData.length;
                    } else {
                        inserted += indexData.length;
                    }
                }
                
                // Progress indicator
                if ((i + batchSize) % 5000 === 0) {
                    process.stdout.write(`    Processed ${Math.min(i + batchSize, records.length)}/${records.length} records...\r`);
                }
            }
            
            console.log(`  ✓ ${fileInfo.year}: Inserted ${inserted}, Skipped ${skipped}`);
            totalInserted += inserted;
            
        } catch (error) {
            console.error(`  ✗ Error processing ${fileInfo.file}:`, error.message);
        }
    }
    
    console.log(`  ✓ Total stock index records imported: ${totalInserted}`);
}

// Main import function
async function importAllCSVData() {
    const dataDir = path.join(__dirname, '../../ia_model/data');
    
    console.log('='.repeat(60));
    console.log('COMPREHENSIVE CSV DATA IMPORT');
    console.log('='.repeat(60));
    console.log(`Data directory: ${dataDir}\n`);
    
    const credentials = [];
    let companiesProcessed = 0;
    
    try {
        // Step 1: Import financial data and create users/companies
        console.log('👥 STEP 1: Creating users and companies from financial data...\n');
        
        const financialFile = path.join(dataDir, 'financial_analysis_results.csv');
        if (!fs.existsSync(financialFile)) {
            console.error(`File not found: ${financialFile}`);
            process.exit(1);
        }
        
        const companies = await readCSV(financialFile);
        console.log(`Found ${companies.length} companies to process\n`);
        
        for (const company of companies) {
            const companyName = (company.company_name || '').toString().trim();
            if (!companyName || companyName === 'company_name') continue;
            
            console.log(`Processing: ${companyName}`);
            
            // Create user
            const userResult = await createCompanyUser(companyName);
            if (userResult.error) continue;
            
            if (!userResult.existing && userResult.password) {
                credentials.push({
                    company: companyName,
                    email: userResult.email,
                    password: userResult.password
                });
            }
            
            // Create company record
            await upsertCompany(companyName, userResult.email);
            companiesProcessed++;
            
            await new Promise(resolve => setTimeout(resolve, 30));
        }
        
        console.log(`\n✓ Processed ${companiesProcessed} companies\n`);
        
        // Step 2: Import financial data
        const companyNames = await importFinancialData(dataDir);
        
        // Step 3: Import CMF links (with company names for matching)
        await importCMFLinks(dataDir, companyNames);
        
        // Step 4: Import stock trading history
        await importStockTradingHistory(dataDir);
        
        // Step 5: Import stock index history
        await importStockIndexHistory(dataDir);
        
        // Save credentials
        if (credentials.length > 0) {
            const credentialsFile = path.join(__dirname, '../../company_credentials.json');
            fs.writeFileSync(credentialsFile, JSON.stringify(credentials, null, 2));
            console.log(`\n✓ Credentials saved to: ${credentialsFile}`);
        }
        
        // Final summary
        console.log('\n' + '='.repeat(60));
        console.log('IMPORT COMPLETE');
        console.log('='.repeat(60));
        console.log(`✅ Companies processed: ${companiesProcessed}`);
        console.log(`✅ Users created: ${credentials.length}`);
        console.log(`✅ All CSV data imported and linked to companies`);
        console.log('='.repeat(60));
        
    } catch (error) {
        console.error('\n❌ Import error:', error);
        process.exit(1);
    }
}

// Run import
if (require.main === module) {
    importAllCSVData().catch(console.error);
}

module.exports = { importAllCSVData };


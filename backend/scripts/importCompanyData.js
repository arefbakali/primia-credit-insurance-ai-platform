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
    
    // Remove special characters, convert to lowercase, replace spaces with dots
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
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
    });
}

// Create or update user for company
async function createCompanyUser(companyName) {
    const normalizedName = normalizeCompanyName(companyName);
    const email = `${normalizedName}@makina.tn`;
    const password = generatePassword();
    
    try {
        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('email')
            .eq('email', email)
            .single();
        
        if (existingUser) {
            console.log(`User already exists: ${email}`);
            return { email, password: null, existing: true };
        }
        
        // Create new user
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
                console.log(`User already exists (constraint): ${email}`);
                return { email, password: null, existing: true };
            }
            throw error;
        }
        
        console.log(`✓ Created user: ${email} (Password: ${password})`);
        return { email, password, existing: false, user: data[0] };
    } catch (error) {
        console.error(`Error creating user for ${companyName}:`, error.message);
        return { email, password: null, error: error.message };
    }
}

// Insert or update financial data
async function upsertFinancialData(companyName, financialData) {
    try {
        // Check if record exists
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
            // Update existing record
            const { error } = await supabase
                .from('financial_results')
                .update(dataToInsert)
                .eq('id', existing.id);
            
            if (error) throw error;
            console.log(`  ✓ Updated financial data for: ${companyName}`);
        } else {
            // Insert new record
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

// Main import function
async function importCompanyData() {
    const dataDir = path.join(__dirname, '../../ia_model/data');
    const csvFile = path.join(dataDir, 'financial_analysis_results.csv');
    
    console.log('Starting company data import...\n');
    console.log(`Reading from: ${csvFile}\n`);
    
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
        
        for (const company of companies) {
            const companyName = company.company_name?.trim();
            if (!companyName) {
                console.log('Skipping company with no name');
                continue;
            }
            
            console.log(`\nProcessing: ${companyName}`);
            
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
            
            // Parse financial data (handle empty strings and null values)
            const financialData = {
                net_result: company.net_result && company.net_result.trim() !== '' 
                    ? parseFloat(company.net_result) : null,
                revenue: company.revenue && company.revenue.trim() !== '' 
                    ? parseFloat(company.revenue) : null,
                margin: company.margin && company.margin.trim() !== '' 
                    ? parseFloat(company.margin) : null,
                status: (company.status && company.status.trim() !== '') 
                    ? company.status.toLowerCase() : 'loss',
                processed_at: company.processed_at || new Date().toISOString()
            };
            
            // Upsert financial data (linked via company_name to user.name)
            await upsertFinancialData(companyName, financialData);
            
            successCount++;
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('Import Summary:');
        console.log('='.repeat(60));
        console.log(`Total companies processed: ${companies.length}`);
        console.log(`Successfully imported: ${successCount}`);
        console.log(`Errors: ${errorCount}`);
        console.log(`New users created: ${credentials.length}`);
        
        // Save credentials to file
        if (credentials.length > 0) {
            const credentialsFile = path.join(__dirname, '../../company_credentials.json');
            fs.writeFileSync(credentialsFile, JSON.stringify(credentials, null, 2));
            console.log(`\n✓ Credentials saved to: ${credentialsFile}`);
            console.log('⚠️  IMPORTANT: Keep this file secure and share passwords with companies securely!');
        }
        
        console.log('\nImport completed!');
        
    } catch (error) {
        console.error('Import error:', error);
        process.exit(1);
    }
}

// Run import
if (require.main === module) {
    importCompanyData().catch(console.error);
}

module.exports = { importCompanyData };


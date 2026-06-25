/**
 * Check what status values are allowed in the quotes table
 */
const supabase = require('./utils/supabaseClient');

async function checkConstraint() {
    if (!supabase) {
        console.log('❌ Supabase not configured');
        return;
    }

    console.log('Checking quotes table status constraint...\n');

    // Try to get constraint info from information_schema
    // Note: This requires direct SQL access, which Supabase JS client doesn't provide easily
    // So we'll try different status values to see what works

    const testStatuses = ['pending', 'generated', 'confirmed', 'updated', 'processing', 'approved', 'rejected'];
    
    console.log('Testing status values...\n');
    
    for (const status of testStatuses) {
        try {
            // Try to insert a test quote (we'll delete it immediately)
            const { data, error } = await supabase
                .from('quotes')
                .insert([{
                    user_email: 'test@test.com',
                    description: 'TEST - DELETE ME',
                    sector: 'TEST',
                    status: status,
                    base_amount: 0,
                    tva_rate: 19
                }])
                .select()
                .single();

            if (error) {
                if (error.message.includes('check constraint')) {
                    console.log(`  ❌ "${status}" - NOT ALLOWED (constraint violation)`);
                } else {
                    console.log(`  ⚠️  "${status}" - Error: ${error.message}`);
                }
            } else {
                console.log(`  ✅ "${status}" - ALLOWED`);
                // Delete the test record
                await supabase.from('quotes').delete().eq('id', data.id);
            }
        } catch (err) {
            console.log(`  ❌ "${status}" - Exception: ${err.message}`);
        }
    }

    console.log('\n✅ Constraint check complete');
}

checkConstraint().catch(console.error);


const supabase = require('./utils/supabaseClient');

const checkSchema = async () => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .limit(1);

        if (error) {
            console.error('Error fetching users:', error);
            return;
        }

        if (data && data.length > 0) {
            console.log('Columns found in users table:', Object.keys(data[0]));
        } else {
            console.log('Users table is empty. Attempting to get columns via another method...');
            // Try to insert a dummy to see error or columns
            const { error: insertError } = await supabase
                .from('users')
                .insert([{ dummy_col: 'test' }]);
            console.log('Insert error hints (might show columns):', insertError?.message);
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
};

checkSchema();

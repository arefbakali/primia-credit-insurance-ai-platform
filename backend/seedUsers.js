const supabase = require('./utils/supabaseClient');

const seedUsers = async () => {
    const usersToSeed = [
        { email: 'admin@makina.com', password: 'adminpassword', name: 'Admin Makina' },
        { email: 'user@makina.com', password: 'userpassword', name: 'Simple User' }
    ];

    for (const user of usersToSeed) {
        console.log(`Checking if user exists: ${user.email}`);
        const { data: existingUser } = await supabase
            .from('users')
            .select('email')
            .eq('email', user.email)
            .single();

        if (!existingUser) {
            console.log(`Inserting user: ${user.email}`);
            const { error } = await supabase
                .from('users')
                .insert([user]);
            if (error) {
                console.error(`Error seeding ${user.email}:`, error.message);
            } else {
                console.log(`Successfully seeded ${user.email}`);
            }
        } else {
            console.log(`User ${user.email} already exists, skipping.`);
        }
    }
};

seedUsers().then(() => console.log('Seeding process finished.'));

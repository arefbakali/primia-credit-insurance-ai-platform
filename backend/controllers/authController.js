const supabase = require('../utils/supabaseClient');
const { generateToken } = require('../utils/jwt');

exports.register = async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ message: 'Database service unavailable. Please configure Supabase credentials.' });
    }

    const { email, password, name } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    // Basic validation
    if (password.length < 3) {
        return res.status(400).json({ message: 'Password must be at least 3 characters long' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
    }

    try {
        // Store password in plaintext (as per database schema)
        const { data, error } = await supabase
            .from('users')
            .insert([{ email, password, name, role: 'user' }])
            .select();

        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                return res.status(400).json({ message: 'User already exists' });
            }
            throw error;
        }

        const user = data[0];
        const userResponse = {
            email: user.email,
            name: user.name,
            role: user.role || 'user'
        };

        // Generate JWT token
        const token = generateToken(userResponse);

        res.status(201).json({
            message: 'User registered successfully',
            user: userResponse,
            token
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.login = async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ message: 'Database service unavailable. Please configure Supabase credentials.' });
    }

    const { email, password } = req.body;
    
    console.log('Login request received:', { email, passwordLength: password?.length });

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        // First, get user by email only
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .limit(1);

        // Check for database errors
        if (error) {
            console.error('Database error during login:', error);
            return res.status(500).json({ 
                message: 'Database error occurred',
                error: error.message 
            });
        }

        // Check if user exists
        if (!data || data.length === 0) {
            console.log('Login attempt failed - user not found:', email);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = data[0];

        // Compare password (plaintext)
        if (user.password !== password) {
            console.log('Login attempt failed - password mismatch for:', email);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Password matches, create user response
        const userResponse = {
            email: user.email,
            name: user.name || '',
            role: user.role || 'user'
        };

        // Generate JWT token
        let token;
        try {
            token = generateToken(userResponse);
        } catch (tokenError) {
            console.error('Token generation error:', tokenError);
            return res.status(500).json({ 
                message: 'Failed to generate authentication token',
                error: tokenError.message 
            });
        }

        console.log('Login successful for:', email);

        res.status(200).json({
            message: 'Login successful',
            user: userResponse,
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            message: 'Internal server error',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

exports.getUsers = async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ message: 'Database service unavailable. Please configure Supabase credentials.' });
    }

    try {
        const { data, error } = await supabase
            .from('users')
            .select('email, name, role, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Error fetching users' });
    }
};

exports.updateUserRole = async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ message: 'Database service unavailable. Please configure Supabase credentials.' });
    }

    const { email, role } = req.body;
    
    if (!email || !role) {
        return res.status(400).json({ message: 'Email and role are required' });
    }

    if (role !== 'admin' && role !== 'user') {
        return res.status(400).json({ message: 'Role must be either "admin" or "user"' });
    }

    try {
        const { data, error } = await supabase
            .from('users')
            .update({ role })
            .eq('email', email)
            .select();

        if (error) throw error;
        
        if (!data || data.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userResponse = {
            email: data[0].email,
            name: data[0].name,
            role: data[0].role
        };

        res.status(200).json({ message: 'User role updated', user: userResponse });
    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({ message: 'Error updating user role' });
    }
};

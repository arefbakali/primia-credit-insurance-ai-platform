/**
 * Quick script to check if routes are registered
 */
const app = require('./app');

console.log('Checking registered routes...\n');

// Get all registered routes
const routes = [];
app._router.stack.forEach((middleware) => {
    if (middleware.route) {
        // Direct route
        routes.push({
            path: middleware.route.path,
            methods: Object.keys(middleware.route.methods)
        });
    } else if (middleware.name === 'router') {
        // Router middleware
        const routerPath = middleware.regexp.source
            .replace('\\/?', '')
            .replace('(?=\\/|$)', '')
            .replace(/\\\//g, '/')
            .replace('^', '')
            .replace('\\', '');
        
        if (middleware.handle && middleware.handle.stack) {
            middleware.handle.stack.forEach((handler) => {
                if (handler.route) {
                    routes.push({
                        path: routerPath + handler.route.path,
                        methods: Object.keys(handler.route.methods)
                    });
                }
            });
        }
    }
});

console.log('Registered Routes:');
routes.forEach(route => {
    console.log(`  ${route.methods.join(', ').toUpperCase().padEnd(7)} ${route.path}`);
});

// Check for our specific route
const hasGenerateRoute = routes.some(r => r.path.includes('/generate'));
console.log(`\n✅ Generate route found: ${hasGenerateRoute}`);

const hasCompleteRoute = routes.some(r => r.path.includes('/complete'));
console.log(`✅ Complete route found: ${hasCompleteRoute}`);


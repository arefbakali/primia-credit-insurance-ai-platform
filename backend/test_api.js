const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testUpload() {
    try {
        console.log('Testing Quote Request API...');
        const form = new FormData();
        form.append('user_email', 'test2@mail.com');
        form.append('description', 'Analyse automatique du rapport financier');
        form.append('sector', 'ASSURANCES');

        // Create a dummy file
        const filePath = path.join(__dirname, 'dummy.txt');
        fs.writeFileSync(filePath, 'dummy content');
        form.append('bank_report', fs.createReadStream(filePath));

        const response = await axios.post('http://localhost:3001/api/quotes/request', form, {
            headers: {
                ...form.getHeaders()
            }
        });

        console.log('Response Status:', response.status);
        console.log('Response Data:', response.data);
    } catch (error) {
        if (error.response) {
            console.error('Error Response:', error.response.status, error.response.data);
        } else {
            console.error('Error Message:', error.message);
        }
    }
}

testUpload();

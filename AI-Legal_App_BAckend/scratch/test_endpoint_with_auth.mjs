import jwt from 'jsonwebtoken';
import http from 'http';

const JWT_SECRET = 'e3e2160ee7a687af7c08e0d4408ea3b56ef3eba604a34687fa50d424c07a1356';
const token = jwt.sign({ id: '65f123456789012345678901', email: 'test@ailegal.com', role: 'Advocate' }, JWT_SECRET, { expiresIn: '7d' });

function testEndpointWithAuth(path, method = 'GET', body = null) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 8080,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`[STATUS ${res.statusCode}] ${method} ${path} =>`, data.slice(0, 400));
                resolve(data);
            });
        });

        req.on('error', (err) => {
            console.error(`[ERROR] ${method} ${path} =>`, err.message);
            resolve(null);
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function run() {
    console.log('--- Testing Authenticated Backend Endpoints ---');
    await testEndpointWithAuth('/api/workspace-activities/cases/6a61c6ef82b45c69bfb69066/activities');
    await testEndpointWithAuth('/api/projects/6a61c6ef82b45c69bfb69066/ai-quick-action/log-activity', 'POST', {
        toolName: 'AI Draft Maker',
        outputType: 'Bail Application',
        content: 'Sample test draft content'
    });
    await testEndpointWithAuth('/api/workspace-activities/cases/6a61c6ef82b45c69bfb69066/activities');
}

run();

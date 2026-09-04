import http from 'http';

function testEndpoint(path, method = 'GET', body = null) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 8080,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`[STATUS ${res.statusCode}] ${method} ${path} =>`, data.slice(0, 300));
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
    console.log('--- Testing Backend Endpoints ---');
    await testEndpoint('/api/workspace-activities/cases/6a61c6ef82b45c69bfb69066/activities');
    await testEndpoint('/api/projects/6a61c6ef82b45c69bfb69066/ai-quick-action/log-activity', 'POST', {
        toolName: 'AI Draft Maker',
        outputType: 'Bail Application',
        content: 'Sample test content'
    });
}

run();

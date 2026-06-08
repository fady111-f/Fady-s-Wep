const http = require('http');
const fs = require('fs');

const PORT = 3000;
const FILE_NAME = 'subscribers.txt';

const server = http.createServer((req, res) => {
    // السماح بالاتصال من أي مكان (CORS) عشان يشتغل معاك محلياً بدون مشاكل
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

    // الرد على طلبات الـ OPTIONS (Preflight)
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // استقبال طلبات الاشتراك
    if (req.method === 'POST' && req.url === '/subscribe') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            let email = '';
            
            try {
                // استخراج الإيميل من البيانات سواء كانت URL Encoded أو JSON أو Multipart FormData
                if (body.includes('name="email"')) {
                    const match = body.match(/name="email"\s*\r?\n\r?\n([^\r\n]+)/);
                    if (match && match[1]) {
                        email = match[1].trim();
                    }
                } else {
                    const params = new URLSearchParams(body);
                    email = params.get('email');
                }
            } catch(e) {
                console.error("Error parsing data", e);
            }

            if (email) {
                // حفظ الإيميل في ملف نصي وإضافة سطر جديد
                fs.appendFile(FILE_NAME, email + '\n', (err) => {
                    if (err) {
                        console.error(err);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Error saving email' }));
                    } else {
                        console.log(`New subscriber added: ${email}`);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    }
                });
            } else {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'No email provided' }));
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`✅ Local Server is running on http://localhost:${PORT}`);
    console.log(`📂 Emails will be saved automatically to: ${FILE_NAME}`);
    console.log(`Press Ctrl+C to stop the server.`);
});

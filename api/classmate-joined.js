export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    // Verify Firebase ID token — decode JWT and check project + expiry
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
        const expired = payload.exp < Math.floor(Date.now() / 1000);
        const wrongProject = payload.aud !== 'mayfield-2011';
        if (expired || wrongProject) return res.status(401).json({ error: 'Invalid token' });
    } catch {
        return res.status(401).json({ error: 'Invalid token' });
    }

    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Missing fields' });

    const html = `
        <p>A classmate just joined the Mayfield Class of 2011 reunion site and is <strong>pending your approval</strong>.</p>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;margin-top:12px;">
            <tr><td style="padding:4px 16px 4px 0;color:#666;">Name</td><td><strong>${name}</strong></td></tr>
            <tr><td style="padding:4px 16px 4px 0;color:#666;">Email</td><td>${email}</td></tr>
        </table>
        <p style="margin-top:16px;">
            <a href="https://mayfield-2011.vercel.app/admin.html" style="background:#2A772A;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;">
                Review &amp; Approve in Admin
            </a>
        </p>
        <p style="margin-top:20px;color:#888;font-size:13px;">Mayfield Wildcats — Class of 2011 Reunion Site</p>
    `;

    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sender: { name: 'Mayfield Class of 2011', email: process.env.SENDER_EMAIL },
                to: [{ email: 'rob.razzante@gmail.com', name: 'Rob Razzante' }],
                replyTo: { email, name },
                subject: `New classmate pending approval — ${name}`,
                htmlContent: html
            })
        });
        if (!response.ok) throw new Error(await response.text());
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Classmate joined email error:', err);
        res.status(500).json({ error: 'Failed to send email' });
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

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

    const firstName = name.split(' ')[0];

    const html = `
        <p>Hey ${firstName}!</p>
        <p>Great news — you've been approved to access the <strong>Mayfield High School Class of 2011</strong> reunion hub.</p>
        <p>Sign in and you'll have access to events, the classmate map, the business network, and more.</p>
        <p style="margin-top:20px;">
            <a href="https://mayfield-2011.vercel.app" style="background:#2A772A;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;">
                Explore the Site
            </a>
        </p>
        <p style="margin-top:24px;color:#888;font-size:13px;">Go Wildcats! — Rob Razzante, Class of 2011</p>
    `;

    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sender: { name: 'Rob Razzante — Mayfield Class of 2011', email: process.env.SENDER_EMAIL },
                to: [{ email, name }],
                subject: `You're in! Welcome to the Class of 2011 hub`,
                htmlContent: html
            })
        });
        if (!response.ok) throw new Error(await response.text());
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Approval email error:', err);
        res.status(500).json({ error: 'Failed to send email' });
    }
}

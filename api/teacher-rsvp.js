export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    const { firstName, lastName, email, subject, years, message } = req.body;
    if (!firstName || !lastName || !email) return res.status(400).json({ error: 'Missing fields' });

    const html = `
        <p>A teacher submitted an RSVP for the Mayfield Class of 2011 lunch. Details below — hit <strong>Reply</strong> to send your thank-you directly to them.</p>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;margin-top:12px;">
            <tr><td style="padding:4px 16px 4px 0;color:#666;vertical-align:top;">Name</td><td><strong>${firstName} ${lastName}</strong></td></tr>
            <tr><td style="padding:4px 16px 4px 0;color:#666;vertical-align:top;">Email</td><td>${email}</td></tr>
            ${subject ? `<tr><td style="padding:4px 16px 4px 0;color:#666;vertical-align:top;">Subject(s)</td><td>${subject}</td></tr>` : ''}
            ${years   ? `<tr><td style="padding:4px 16px 4px 0;color:#666;vertical-align:top;">Years at MHS</td><td>${years}</td></tr>` : ''}
            ${message ? `<tr><td style="padding:4px 16px 4px 0;color:#666;vertical-align:top;">Message</td><td><em>"${message}"</em></td></tr>` : ''}
        </table>
        <p style="margin-top:20px;color:#888;font-size:13px;">Mayfield Wildcats — Class of 2011 Reunion Site</p>
    `;

    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'api-key': process.env.BREVO_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sender: { name: 'Mayfield Class of 2011', email: process.env.SENDER_EMAIL || 'noreply@mayfieldwildcats2011.com' },
                to: [{ email: 'rob.razzante@gmail.com', name: 'Rob Razzante' }],
                replyTo: { email, name: `${firstName} ${lastName}` },
                subject: `Teacher RSVP — ${firstName} ${lastName} — Lunch Sep 19`,
                htmlContent: html
            })
        });
        if (!response.ok) throw new Error(await response.text());
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Teacher RSVP email error:', err);
        res.status(500).json({ error: 'Failed to send email' });
    }
}

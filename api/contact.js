export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    const { to, toName, fromName, fromEmail, message } = req.body;
    if (!to || !fromName || !fromEmail || !message) return res.status(400).json({ error: 'Missing fields' });

    const html = `
        <p>Hi ${toName || 'Classmate'},</p>
        <p>You have a new message from a Mayfield Class of 2011 classmate via the reunion site's Business Network.</p>
        <hr>
        <p><strong>From:</strong> ${fromName} (${fromEmail})</p>
        <p><strong>Message:</strong></p>
        <blockquote style="border-left:3px solid #2B6B3C;padding:0 1rem;color:#444;">${message.replace(/\n/g, '<br>')}</blockquote>
        <hr>
        <p>Reply directly to <a href="mailto:${fromEmail}">${fromEmail}</a> to respond.</p>
        <p style="font-size:0.85em;color:#888;">Mayfield Wildcats — Class of 2011 Reunion Site</p>
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
                to: [{ email: to, name: toName || 'Classmate' }],
                replyTo: { email: fromEmail, name: fromName },
                subject: `Message from ${fromName} — Mayfield 2011 Business Network`,
                htmlContent: html
            })
        });
        if (!response.ok) throw new Error(await response.text());
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Email error:', err);
        res.status(500).json({ error: 'Failed to send email' });
    }
}

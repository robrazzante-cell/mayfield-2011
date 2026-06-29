export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    const { id, text, userName, collection } = req.body;

    const html = `
        <p><strong>A comment has been flagged on the Mayfield Class of 2011 reunion site.</strong></p>
        <hr>
        <p><strong>Collection:</strong> ${collection}</p>
        <p><strong>Comment ID:</strong> ${id}</p>
        <p><strong>Author:</strong> ${userName || 'Unknown'}</p>
        <p><strong>Comment text:</strong></p>
        <blockquote style="border-left:3px solid #D32F2F;padding:0 1rem;color:#444;">${(text || '').replace(/</g,'&lt;')}</blockquote>
        <hr>
        <p>Log in to the admin Firebase console to review and delete if necessary.</p>
        <p style="font-size:0.85em;color:#888;">Mayfield Wildcats — Class of 2011 Reunion Site</p>
    `;

    try {
        await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'api-key': process.env.BREVO_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sender: { name: 'Mayfield 2011 Site', email: process.env.SENDER_EMAIL || 'noreply@mayfieldwildcats2011.com' },
                to: [{ email: 'rob.razzante@gmail.com', name: 'Rob Razzante' }],
                subject: '⚠️ Flagged Comment — Mayfield Class of 2011',
                htmlContent: html
            })
        });
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Flag email error:', err);
        res.status(500).json({ error: 'Failed to notify' });
    }
}

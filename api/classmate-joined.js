export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Missing fields' });

    const html = `
        <p>A classmate just joined the Mayfield Class of 2011 reunion site. Hit <strong>Reply</strong> to send them a welcome note.</p>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;margin-top:12px;">
            <tr><td style="padding:4px 16px 4px 0;color:#666;">Name</td><td><strong>${name}</strong></td></tr>
            <tr><td style="padding:4px 16px 4px 0;color:#666;">Email</td><td>${email}</td></tr>
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
                sender: { name: 'Mayfield Class of 2011', email: process.env.SENDER_EMAIL },
                to: [{ email: 'rob.razzante@gmail.com', name: 'Rob Razzante' }],
                replyTo: { email, name },
                subject: `New classmate joined — ${name}`,
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

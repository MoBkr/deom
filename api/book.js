export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, slotTime, timeZone = 'UTC' } = req.body ?? {};
  const { CAL_API_KEY, CAL_EVENT_TYPE_ID } = process.env;

  if (!name || !email || !slotTime) {
    return res.status(400).json({ error: 'Missing required fields: name, email, slotTime' });
  }

  if (!CAL_API_KEY || !CAL_EVENT_TYPE_ID) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const response = await fetch(
      `https://api.cal.com/v1/bookings?apiKey=${CAL_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventTypeId: Number(CAL_EVENT_TYPE_ID),
          start: slotTime,
          responses: {
            name,
            email,
            location: { value: 'integrations:daily', optionValue: '' },
          },
          timeZone,
          language: 'en',
          metadata: {},
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('Cal.com booking error:', err);
      return res.status(502).json({ error: 'Failed to create booking', detail: err });
    }

    const booking = await response.json();

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({
      success: true,
      bookingId: booking.uid,
      meetingLink: booking.meetingUrl ?? null,
      start: booking.startTime,
      title: booking.title,
    });
  } catch (err) {
    console.error('Book handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

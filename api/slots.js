export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { timeZone = 'UTC' } = req.query;
  const { CAL_API_KEY, CAL_EVENT_TYPE_ID } = process.env;

  if (!CAL_API_KEY || !CAL_EVENT_TYPE_ID) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const params = new URLSearchParams({
    eventTypeId: CAL_EVENT_TYPE_ID,
    start: start.toISOString(),
    end: end.toISOString(),
    timeZone,
  });

  try {
    const response = await fetch(
      `https://api.cal.com/v2/slots?${params}`,
      {
        headers: {
          'cal-api-version': '2024-09-04',
          Authorization: `Bearer ${CAL_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('Cal.com slots error:', err);
      return res.status(502).json({ error: 'Failed to fetch available slots', detail: err });
    }

    const data = await response.json();

    // v2 /slots response: { data: { "YYYY-MM-DD": [{ start: "..." }, ...] }, status: "success" }
    const slots = [];
    const slotsByDay = data.data ?? {};

    for (const [date, daySlots] of Object.entries(slotsByDay)) {
      for (const slot of daySlots) {
        if (slots.length >= 6) break;
        const dt = new Date(slot.start);
        const label = dt.toLocaleString('en-US', {
          timeZone,
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        slots.push({ label, value: slot.start });
      }
      if (slots.length >= 6) break;
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ slots });
  } catch (err) {
    console.error('Slots handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

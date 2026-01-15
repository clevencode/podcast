// api/podcast.js - Vercel Serverless Function
export default async function handler(req, res) {
  const rssUrl = 'https://anchor.fm/s/SEU_ID_AQUI/podcast/rss'; // ← seu RSS aqui

  try {
    const response = await fetch(rssUrl);
    if (!response.ok) throw new Error('Erro no RSS');
    const xml = await response.text();

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate'); // cache 5 min
    res.status(200).send(xml);
  } catch (error) {
    res.status(500).json({ error: 'Falha ao carregar RSS' });
  }
}
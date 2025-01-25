import fetch from 'node-fetch';
import xml2js from 'xml2js';
import fs from 'fs/promises';

async function updateYouTubeVideos() {
  const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;
  
  if (!CHANNEL_ID) {
    throw new Error('YOUTUBE_CHANNEL_ID no está configurado como variable de entorno');
  }

  const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

  try {
    const response = await fetch(RSS_URL);
    if (!response.ok) {
      throw new Error('Error al obtener el feed RSS');
    }
    const xmlData = await response.text();

    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xmlData);

    const videos = result.feed.entry.map(entry => {
      const videoId = entry['yt:videoId'][0];
      return {
        title: entry.title[0],
        description: entry.description ? entry.description[0] : '',
        channelId: 'UsachPremium', 
        channelTitle: entry['author'][0]['name'][0],
        videoId: videoId,
        thumbnails: {
          default: {
            url: `https://i.ytimg.com/vi/${videoId}/default.jpg`,
            width: 120,
            height: 90
          },
          medium: {
            url: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
            width: 320,
            height: 180
          },
          high: {
            url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            width: 480,
            height: 360
          }
        },
        publishedAt: entry.published[0]
      };
    });

    await fs.writeFile('src/config/youtube.json', JSON.stringify(videos, null, 2));
    console.log('Videos actualizados');

  } catch (error) {
    console.error('Error al actualizar videos!', error);
    if (result && result.feed) {
        console.error('Estructura del feed:', JSON.stringify(result.feed, null, 2));
    }
    process.exit(1);
  }
}

updateYouTubeVideos();
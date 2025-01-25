import fetch from 'node-fetch';
import xml2js from 'xml2js';
import fs from 'fs/promises';
import path from 'path';

async function updateYouTubeVideos() {
  const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;
  
  if (!CHANNEL_ID) {
    throw new Error('YOUTUBE_CHANNEL_ID no está configurado como variable de entorno');
  }

  const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
  let result;

  try {
    try {
      await fs.mkdir('src/config', { recursive: true });
    } catch (mkdirError) {
      console.error('Error al crear el directorio src/config:', mkdirError);
    }

    try {
      await fs.access('src/config', fs.constants.W_OK);
    } catch (error) {
      throw new Error('No hay permisos de escritura en src/config');
    }

    const response = await fetch(RSS_URL);
    if (!response.ok) {
      throw new Error(`Error al obtener el feed RSS: ${response.status} ${response.statusText}`);
    }
    const xmlData = await response.text();

    const parser = new xml2js.Parser();
    result = await parser.parseStringPromise(xmlData);

    if (!result?.feed?.entry?.length) {
      throw new Error('No se encontraron videos en el feed');
    }

    const videos = result.feed.entry.map(entry => {
      const videoId = entry['yt:videoId'][0];
      const title = entry.title[0];
      const description = entry.description ? entry.description[0] : '';
      const publishedAt = entry.published[0];
      const channelTitle = entry['author'][0]['name'][0];

      // Validar datos requeridos
      if (!videoId || !title || !publishedAt) {
        console.warn(`Video con datos incompletos: ${JSON.stringify(entry)}`);
      }

      return {
        title,
        description,
        channelId: 'UsachPremium',
        channelTitle,
        videoId,
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
        publishedAt
      };
    });

    const outputPath = path.join('src', 'config', 'youtube.json');
  
    let shouldUpdate = true;
    try {
      const currentContent = await fs.readFile(outputPath, 'utf8');
      const currentVideos = JSON.parse(currentContent);
      shouldUpdate = JSON.stringify(currentVideos) !== JSON.stringify(videos);
    } catch (error) {
      // Si el archivo no existe o hay error al leerlo, continuamos con la actualización
      console.log('No se pudo leer el archivo actual, se creará uno nuevo');
    }

    if (shouldUpdate) {
      await fs.writeFile(outputPath, JSON.stringify(videos, null, 2));
      console.log('Videos actualizados exitosamente');
    } else {
      console.log('No hay cambios nuevos en los videos');
    }

  } catch (error) {
    console.error('Error al actualizar videos:', error.message);
    if (result?.feed) {
      console.error('Estructura del feed:', JSON.stringify(result.feed, null, 2));
    }
    process.exit(1);
  }
}

updateYouTubeVideos();
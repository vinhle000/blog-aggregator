import { type RSSFeed, RSSItem } from './types';
import { XMLParser } from 'fast-xml-parser';

export async function fetchFeed(feedURL: string): Promise<RSSFeed> {
  const options = {
    headers: {
      'User-Agent': 'gator',
    },
  };
  // 1. fetch the feed data
  const response = await fetch(feedURL, options);
  const dataText = await response.text();

  // 2. Parse XML
  const parser = new XMLParser();
  let jsObject = parser.parse(dataText);

  // 3. Extract the channel field
  // Verify that the channel field exists before proceeding.
  // Handle errors if it does not.
  const { channel } = jsObject?.rss;
  if (!channel) {
    throw new Error(
      `channel field does not exist in parsed xml object: ${JSON.stringify(
        jsObject,
        null,
        2
      )}`
    );
  }

  //4. Extract metaDat:  title, link, and description fields from the channel field
  const { title, link, description } = channel;
  if (!title || !link || !description) {
    throw new Error(`Extracted some metadata fiels are not present`);
  }

  // 5. Extract feed items:
  const rssItems: RSSItem[] = [];
  let { item } = jsObject.rss.channel;

  if (Array.isArray(item)) {
    for (let { title, link, description, pubDate } of item) {
      if (!title || !link || !description || !pubDate) continue;

      const rssItem: RSSItem = {
        title: title,
        link: link,
        description: description,
        pubDate: pubDate,
      };

      rssItems.push(rssItem);
    }
  }

  const rssFeed: RSSFeed = {
    channel: {
      title: title,
      link: link,
      description: description,
      item: rssItems,
    },
  };

  return rssFeed;
}

/// RUN test/debug only this script
// npx tsx
fetchFeed('https://hnrss.org/frontpage')
  .then((feed) => console.log('fetchFeed() resolved return ----> ', feed))
  .catch((err) => console.error('Error fetching feed:', err));

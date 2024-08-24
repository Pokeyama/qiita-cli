import { TwitterApi } from "twitter-api-v2";

const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY || "",
  appSecret: process.env.TWITTER_API_SECRET || "",
  accessToken: process.env.TWITTER_ACCESS_TOKEN || "",
  accessSecret: process.env.TWITTER_ACCESS_SECRET || "",
});

export const tweet = async (args: string[]) => {
  const message = args.join(" ");
  try {
    const tweetResponse = await client.v2.tweet(message);
    console.log("Successfully tweeted:", tweetResponse.data);
  } catch (err) {
    console.error("Failed to send tweet:", err);
  }
};

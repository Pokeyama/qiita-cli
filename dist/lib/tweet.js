"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tweet = void 0;
const twitter_api_v2_1 = require("twitter-api-v2");
const tweet = async (args) => {
    // 環境変数が設定されているか確認
    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_SECRET;
    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
        console.log("Twitter API keys are not set. Skipping tweet.");
        return;
    }
    // 環境変数が揃っている場合のみ、Twitter APIクライアントを初期化
    const client = new twitter_api_v2_1.TwitterApi({
        appKey: apiKey,
        appSecret: apiSecret,
        accessToken: accessToken,
        accessSecret: accessSecret,
    });
    const message = args.join(" ");
    try {
        const tweetResponse = await client.v2.tweet(message);
        console.log("Successfully tweeted:", tweetResponse.data);
    }
    catch (err) {
        console.error("Failed to send tweet:", err);
    }
};
exports.tweet = tweet;
//# sourceMappingURL=tweet.js.map
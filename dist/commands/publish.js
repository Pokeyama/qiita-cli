"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publish = void 0;
const arg_1 = __importDefault(require("arg"));
const node_process_1 = __importDefault(require("node:process"));
const check_frontmatter_type_1 = require("../lib/check-frontmatter-type");
const get_file_system_repo_1 = require("../lib/get-file-system-repo");
const get_qiita_api_instance_1 = require("../lib/get-qiita-api-instance");
const sync_articles_from_qiita_1 = require("../lib/sync-articles-from-qiita");
const item_validator_1 = require("../lib/validators/item-validator");
const tweet_1 = require("../lib/tweet"); // インポート
const qiita_api_1 = require("../qiita-api");
const publish = async (argv) => {
    const args = (0, arg_1.default)({
        "--all": Boolean,
        "--force": Boolean,
        "-f": "--force",
    }, { argv });
    const qiitaApi = await (0, get_qiita_api_instance_1.getQiitaApiInstance)();
    const fileSystemRepo = await (0, get_file_system_repo_1.getFileSystemRepo)();
    await (0, sync_articles_from_qiita_1.syncArticlesFromQiita)({ fileSystemRepo, qiitaApi });
    let targetItems;
    if (args["--all"]) {
        targetItems = (await fileSystemRepo.loadItems()).filter((item) => {
            if (item.ignorePublish === true)
                return false;
            return item.modified || item.id === null;
        });
    }
    else {
        const items = [];
        for (const basename of args._) {
            const item = await fileSystemRepo.loadItemByBasename(basename);
            if (item === null) {
                console.error(`Error: '${basename}' is not found`);
                node_process_1.default.exit(1);
            }
            items.push(item);
        }
        targetItems = items;
    }
    // Validate
    const enableForcePublish = args["--force"];
    const invalidItemMessages = targetItems.reduce((acc, item) => {
        const frontmatterErrors = (0, check_frontmatter_type_1.checkFrontmatterType)(item);
        if (frontmatterErrors.length > 0)
            return [...acc, { name: item.name, errors: frontmatterErrors }];
        const validationErrors = (0, item_validator_1.validateItem)(item);
        if (validationErrors.length > 0)
            return [...acc, { name: item.name, errors: validationErrors }];
        if (!enableForcePublish && item.isOlderThanRemote) {
            return [
                ...acc,
                {
                    name: item.name,
                    errors: ["内容がQiita上の記事より古い可能性があります"],
                },
            ];
        }
        return acc;
    }, []);
    if (invalidItemMessages.length > 0) {
        const chalk = (await import("chalk")).default;
        invalidItemMessages.forEach((msg) => {
            msg.errors.forEach((err) => {
                const errorName = chalk.red.bold(msg.name + ":");
                const errorDescription = chalk.red(err);
                console.error(`${errorName} ${errorDescription}`);
            });
        });
        node_process_1.default.exit(1);
    }
    if (targetItems.length === 0) {
        console.log("Nothing to publish");
        node_process_1.default.exit(0);
    }
    const promises = targetItems.map(async (item) => {
        let responseItem;
        if (item.id) {
            responseItem = await qiitaApi.patchItem({
                rawBody: item.rawBody,
                tags: item.tags,
                title: item.title,
                uuid: item.id,
                isPrivate: item.secret,
                organizationUrlName: item.organizationUrlName,
                slide: item.slide,
            });
            console.log(`Updated: ${item.name} -> ${item.id}`);
        }
        else {
            responseItem = await qiitaApi.postItem({
                rawBody: item.rawBody,
                tags: item.tags,
                title: item.title,
                isPrivate: item.secret,
                organizationUrlName: item.organizationUrlName,
                slide: item.slide,
            });
            await fileSystemRepo.updateItemUuid(item.name, responseItem.id);
            // post is X.
            const tweetMessage = `記事を投稿しました！\n\n${responseItem.title}\n${responseItem.url}\n#Qiita`;
            try {
                console.log(`private is : ${responseItem.private}`);
                if (!responseItem.private) {
                    await (0, tweet_1.tweet)([tweetMessage]);
                }
            }
            catch (err) {
                console.error("Failed to post on Twitter:", err);
            }
            console.log(`Posted: ${item.name} -> ${responseItem.id}`);
        }
        await fileSystemRepo.saveItem(responseItem, false, true);
    });
    try {
        await Promise.all(promises);
    }
    catch (err) {
        if (err instanceof qiita_api_1.QiitaForbiddenError) {
            // patchItem and postItem is possible to return 403 by bad request.
            throw new qiita_api_1.QiitaForbiddenOrBadRequestError(err.message, { cause: err });
        }
        throw err;
    }
    console.log("Successful!");
};
exports.publish = publish;
//# sourceMappingURL=publish.js.map
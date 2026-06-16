import { client, DEFAULT_MODEL } from "./lib/openai.js";
import { spinner } from "./utils/spinner.js";
import { toOpenAITool } from "./utils/func-tool.js";
import { initMessage, addMessage, pushMessage, getMessages } from "./db/messages.js";
import * as allTools from "./tools/index.js";
import readline from "readline";

const toolList = Object.values(allTools);
const tools = toolList.map(toOpenAITool);
const AVAILABLE_TOOLS = Object.fromEntries(toolList.map((t) => [t.name, t.fn]));

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

await initMessage(
    "你是一位生活小幫手，可以查詢現在時間以及ubike的站點資訊，請協助使用者解決問題。"
);

while (true) {
    const userInput = await ask("\n請輸入問題：");
    if (!userInput.trim()) break;

    await addMessage(userInput, "user");

    while (true) {
        const spin = spinner("思考中...").start();

        const response = await client.chat.completions.create({
            model: DEFAULT_MODEL,
            messages: getMessages(),
            tools,
            tool_choice: "auto",
        });

        spin.stop();

        const message = response.choices[0].message;
        await pushMessage(message);

        if (!message.tool_calls || message.tool_calls.length === 0) {
            console.log(message.content);
            break;
        }

        for (const toolCall of message.tool_calls) {
            const fnName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);
            console.log(`\n[呼叫 tool] ${fnName}(${JSON.stringify(args)})`);

            const fn = AVAILABLE_TOOLS[fnName];
            const result = await fn(args);

            await pushMessage({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(result),
            });
        }
    }
}

rl.close();
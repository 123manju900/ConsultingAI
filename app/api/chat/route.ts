// app/api/chat/route.ts
import { streamText, UIMessage, convertToModelMessages, stepCountIs } from 'ai';
import { MODEL } from '@/config';
import { SYSTEM_PROMPT } from '@/prompts';
import { isContentFlagged } from '@/lib/moderation';
import { webSearch } from './tools/web-search';
import { vectorDatabaseSearch } from './tools/search-vector-database';
import { kv } from '@vercel/kv';
import { nanoid } from 'nanoid';

export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages, sessionId }: { messages: UIMessage[], sessionId?: string } = await req.json();
    
    // Generate or use existing session ID
    const currentSessionId = sessionId || nanoid();

    const latestUserMessage = messages
        .filter(msg => msg.role === 'user')
        .pop();

    if (latestUserMessage) {
        const textParts = latestUserMessage.parts
            .filter(part => part.type === 'text')
            .map(part => 'text' in part ? part.text : '')
            .join('');

        if (textParts) {
            const moderationResult = await isContentFlagged(textParts);

            if (moderationResult.flagged) {
                const stream = createUIMessageStream({
                    execute({ writer }) {
                        const textId = 'moderation-denial-text';

                        writer.write({ type: 'start' });
                        writer.write({ type: 'text-start', id: textId });
                        writer.write({
                            type: 'text-delta',
                            id: textId,
                            delta: moderationResult.denialMessage || "Your message violates our guidelines. I can't answer that.",
                        });
                        writer.write({ type: 'text-end', id: textId });
                        writer.write({ type: 'finish' });
                    },
                });

                return createUIMessageStreamResponse({ stream });
            }
        }
    }

    const result = streamText({
        model: MODEL,
        system: SYSTEM_PROMPT,
        messages: convertToModelMessages(messages),
        tools: {
            webSearch,
            vectorDatabaseSearch,
        },
        stopWhen: stepCountIs(10),
        providerOptions: {
            openai: {
                reasoningSummary: 'auto',
                reasoningEffort: 'low',
                parallelToolCalls: false,
            }
        },
        onFinish: async ({ text, usage }) => {
            // ✅ ACTUALLY STORE TO VERCEL KV
            try {
                // Store the complete conversation
                await kv.set(`chat:${currentSessionId}`, {
                    messages: messages,
                    lastResponse: text,
                    timestamp: Date.now(),
                    usage: usage,
                });

                // Store session metadata separately for easy retrieval
                await kv.set(`session:${currentSessionId}:meta`, {
                    lastActivity: Date.now(),
                    messageCount: messages.length,
                });

                // Set expiration (optional - expires after 7 days)
                await kv.expire(`chat:${currentSessionId}`, 60 * 60 * 24 * 7);
                
            } catch (error) {
                console.error('Failed to store chat session:', error);
            }
        }
    });

    return result.toUIMessageStreamResponse({
        sendReasoning: true,
        headers: {
            'X-Session-Id': currentSessionId,
        }
    });
}

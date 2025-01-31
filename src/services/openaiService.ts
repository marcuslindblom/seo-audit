import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function improveText(
  text: string,
  type: 'title' | 'sentence' | 'paragraph',
  constraints: {
    maxLength?: number;
    targetReadingLevel?: string;
  } = {}
): Promise<string> {
  let prompt = `Improve this ${type}: "${text}"\n\n`;

  if (type === 'title') {
    prompt += 'Make it more SEO-friendly and engaging while keeping it concise (50-60 characters).';
  } else if (type === 'sentence') {
    prompt += 'Make it clearer and easier to read while maintaining the same meaning.';
  } else {
    prompt += 'Make it more readable and engaging while maintaining the same key points.';
  }

  if (constraints.maxLength) {
    prompt += `\nKeep it under ${constraints.maxLength} characters.`;
  }

  if (constraints.targetReadingLevel) {
    prompt += `\nTarget a ${constraints.targetReadingLevel} reading level.`;
  }

  const completion = await openai.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
  });

  return completion.choices[0].message.content || text;
}
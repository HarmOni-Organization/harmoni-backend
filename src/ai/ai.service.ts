import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Mistral } from '@mistralai/mistralai';

@Injectable()
export class AiService {
  private client: Mistral;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('MISTRAL_API_KEY');
    if (!apiKey) {
      throw new Error(
        'MISTRAL_API_KEY is not defined in environment variables.',
      );
    }
    this.client = new Mistral({ apiKey });
  }

  /** Generate a structured prompt */
  private buildPrompt(tree: string): string {
    return `Below is a directory tree structure. Extract only the movie,TV show or anime names from the folder names. 
Do not include file names, extensions, or unnecessary metadata. 
Return the names as a clean JSON array.

Tree structure:
\`\`\`
${tree}
\`\`\`

Format:
["Anime Name 1", "Anime Name 2", "Movie Name 3"]`;
  }

  /** Query Mistral with a tree structure */
  async extractMovieAnimeNames(tree: string): Promise<string[]> {
    try {
      const prompt = this.buildPrompt(tree);

      const response = await this.client.chat.complete({
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: prompt }],
      });

      let content = response.choices[0].message.content;

      if (Array.isArray(content)) {
        content = content
          .filter((chunk) => chunk.type === 'text') // Only process text chunks
          .map((chunk: any) => chunk.text || '') // Extract text safely
          .join(' '); // Combine into a single string
      }

      try {
        const arrayContent = content
          .replace('```json', '')
          .replace('```', '')
          .trim();

        console.log({ arrayContent });

        const extractedNames = JSON.parse(arrayContent);
        if (
          Array.isArray(extractedNames) &&
          extractedNames.every((name) => typeof name === 'string')
        ) {
          return extractedNames;
        }
      } catch (err) {
        console.error('Failed to parse Mistral response:', err);
      }

      throw new Error('Mistral returned an unexpected response format.');
    } catch (error) {
      console.error('Error extracting movie/anime names:', error);
      throw new InternalServerErrorException(
        'Failed to extract movie/anime names.',
      );
    }
  }
}

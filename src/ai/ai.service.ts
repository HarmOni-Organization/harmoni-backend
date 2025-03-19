import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Mistral } from '@mistralai/mistralai';

@Injectable()
export class AiService {
  private client: Mistral;
  private readonly logger = new Logger(AiService.name);
  private readonly useMockData: boolean;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('MISTRAL_API_KEY');
    this.useMockData =
      !apiKey || apiKey === 'invalid' || process.env.NODE_ENV === 'test';

    if (this.useMockData) {
      this.logger.warn(
        'No valid Mistral API key found. Using mock data for AI responses.',
      );
    } else {
      try {
        this.client = new Mistral({ apiKey });
      } catch (error) {
        this.logger.error('Failed to initialize Mistral client:', error);
        this.useMockData = true;
      }
    }
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

  /** Extract movie/anime names from the tree using simple regex as fallback */
  private extractNamesFromTreeWithRegex(tree: string): string[] {
    // Extract lines that look like directory names
    const lines = tree.split('\n');
    const folderNames: string[] = [];

    // Simple pattern matching to find folder names
    const folderPattern = /(?:├──|└──)\s+([^\/]+)\/\s*$/;

    for (const line of lines) {
      const match = line.match(folderPattern);
      if (match && match[1]) {
        folderNames.push(match[1].trim());
      }
    }

    return folderNames;
  }

  /** Query Mistral with a tree structure */
  async extractMovieAnimeNames(tree: string): Promise<string[]> {
    try {
      // If we're using mock data, return immediately with simple regex extraction
      if (this.useMockData) {
        this.logger.log('Using mock data extraction method');
        // Simple extraction of folder names from the tree structure
        const extractedNames = this.extractNamesFromTreeWithRegex(tree);
        if (extractedNames.length > 0) {
          return extractedNames;
        }
        // If regex fails, return some demo data
        return ['Inception', 'Your Name'];
      }

      const prompt = this.buildPrompt(tree);

      const response = await this.client.chat.complete({
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: prompt }],
      });

      // Get content from response
      const content = response.choices[0].message.content;

      // Handle content based on its type (string or array)
      let contentString: string;

      if (typeof content === 'string') {
        contentString = content;
      } else if (Array.isArray(content)) {
        contentString = content
          .filter((chunk) => chunk.type === 'text') // Only process text chunks
          .map((chunk: any) => chunk.text || '') // Extract text safely
          .join(''); // Combine into a single string
      } else {
        throw new Error('Mistral returned an unexpected response format.');
      }

      try {
        // Clean up the response and parse it
        // Remove markdown code blocks if present
        const cleanedContent = contentString
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();

        this.logger.log('Cleaned content:', cleanedContent);

        const extractedNames = JSON.parse(cleanedContent);

        if (
          Array.isArray(extractedNames) &&
          extractedNames.every((name) => typeof name === 'string')
        ) {
          return extractedNames;
        }

        throw new Error('Response is not an array of strings.');
      } catch (err) {
        this.logger.error('Failed to parse Mistral response:', err);

        // Fallback to regex extraction if API response parsing fails
        const extractedNames = this.extractNamesFromTreeWithRegex(tree);
        if (extractedNames.length > 0) {
          this.logger.log('Falling back to regex extraction method');
          return extractedNames;
        }

        throw new Error(`Failed to parse API response: ${err.message}`);
      }
    } catch (error) {
      this.logger.error('Error extracting movie/anime names:', error);

      // If any error occurs, try regex extraction as fallback
      const extractedNames = this.extractNamesFromTreeWithRegex(tree);
      if (extractedNames.length > 0) {
        this.logger.log('Falling back to regex extraction method after error');
        return extractedNames;
      }

      throw new InternalServerErrorException(
        `Failed to extract movie/anime names: ${error.message}`,
      );
    }
  }
}

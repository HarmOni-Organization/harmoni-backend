import {
  IsString,
  IsOptional,
  IsArray,
  IsNotEmpty,
  ArrayUnique,
} from 'class-validator';

export class CreatePromptDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsNotEmpty({ message: 'Prompt content is required' })
  @IsString()
  content: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdatePromptDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  tags?: string[];
}

export class GetPromptDto {
  @IsString()
  @IsNotEmpty()
  promptId: string;
}

export class GetUserPromptsDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class PromptResponseDto {
  promptId: string;
  title: string;
  content: string;
  userId: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

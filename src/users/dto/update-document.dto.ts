import { IsString, Matches } from 'class-validator';

export class UpdateDocumentDto {
  @IsString()
  @Matches(/^\d{11}$/, {
    message: 'document_must_be_11_digits',
  })
  document!: string;
}

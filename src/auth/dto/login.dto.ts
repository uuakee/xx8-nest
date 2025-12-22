import { IsString, Length } from 'class-validator';

export class LoginDto {
  @IsString()
  @Length(10, 20)
  phone!: string;

  @IsString()
  @Length(6, 100)
  password!: string;
}

import { IsString, Length } from 'class-validator';

export class GameLaunchDto {
  @IsString()
  @Length(1, 100)
  game_id!: string;
}
